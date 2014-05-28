var newnodes;
var fminitialized=false;
var panelDomQueue = []
	, DOM_TRANSFER_LIMIT = 15

if (typeof seqno == 'undefined') var seqno = Math.floor(Math.random()*1000000000);
if (typeof n_h == 'undefined') var n_h = false;
if (typeof requesti == 'undefined') var requesti = makeid(10);
if (typeof folderlink == 'undefined') var folderlink = false;
if (typeof lang == 'undefined') var lang = 'en';
if (typeof Ext == 'undefined') var Ext = false;
if (typeof ie9 == 'undefined') var ie9 = false;
if (typeof loadingDialog == 'undefined')
{
	var loadingDialog = {};
	loadingDialog.show = function()
	{
		$('.dark-overlay').show();
		$('.loading-spinner').show();
	};
	loadingDialog.hide = function()
	{
		$('.dark-overlay').hide();
		$('.loading-spinner').hide();
	};
}

var fmconfig ={};
if (localStorage.fmconfig) fmconfig = JSON.parse(localStorage.fmconfig);
var maxaction;
var zipid=1;



function MegaData ()
{
	this.d = {};
	this.v = [];
	this.c = {};
	this.u = {};
	this.t = {};
	this.h = {};
	this.sn = false;
	this.filter = false;
	this.sortfn = false;
	this.sortd = false;
	this.rendered = false;
	this.currentdirid = false;
	this.viewmode = 0;
	
	this.csortd = -1;
	this.csort = 'name';

	this.reset = function()
	{
		this.d = {};
		this.v = [];
		this.c = {};
		this.u = {};
		this.t = {};
		this.sn = false;
		this.filter = false;
		this.sortfn = false;
		this.sortd = false;
		this.rendered = false;
		this.RootID=undefined;
		this.RubbishID=undefined;
		this.InboxID=undefined;
		this.viewmode = 0;
	}

	this.sortBy = function(fn,d)
	{
		this.v.sort(function(a,b)
		{
			if (!d) d=1;
			if (a.t > b.t) return -1;
			else if (a.t < b.t) return 1;
			return fn(a,b,d);
		});
		this.sortfn=fn;
		this.sortd=d;
	};

	this.sort = function()
	{
		this.sortBy(this.sortfn,this.sortd);
		this.sortBy(this.sortfn,this.sortd);
	};

	this.sortReverse = function()
	{
		var d= 1;
		if (this.sortd > 0) d=-1;
		this.sortBy(this.sortfn,d);
	};

	this.sortByName = function(d)
	{
		this.sortfn = function(a,b,d)
		{
			if (typeof a.name == 'string' && typeof b.name == 'string') return a.name.localeCompare(b.name)*d;
			else return -1;
		};
		this.sortd=d;
		this.sort();
	};

	this.sortByDateTime = function(d)
	{
		this.sortfn = function(a,b,d)
		{
			if (a.ts < b.ts) return -1*d;
			else return 1*d;
		}
		this.sortd=d;
		this.sort();
	};

	this.sortBySize = function(d)
	{
		this.sortfn = function(a,b,d)
		{
			if (typeof a.s !== 'undefined' && typeof b.s !== 'undefined' && a.s < b.s) return -1*d;
			else return 1*d;
		}
		this.sortd=d;
		this.sort();
	};

	this.sortByType = function(d)
	{
		this.sortfn = function(a,b,d)
		{
			if (typeof a.name == 'string' && typeof b.name == 'string') return filetype(a.name).localeCompare(filetype(b.name))*d;
			else return -1;
		}
		this.sortd=d;
		this.sort();
	};

	this.doSort = function(n,d)
	{
		$('.grid-table-header .arrow').removeClass('asc desc');
		if (d > 0) $('.arrow.'+n).addClass('desc');
		else $('.arrow.'+n).addClass('asc');
		if (n == 'name') M.sortByName(d);
		else if (n == 'size') M.sortBySize(d);
		else if (n == 'type') M.sortByType(d);
		else if (n == 'date') M.sortByDateTime(d);
		if (fmconfig.uisorting) storefmconfig('sorting',{n:n,d:d});
		else fmsortmode(M.currentdirid,n,d);
	};

	/* Filters: */
	this.filterBy = function (f)
	{
		this.filter=f;
		this.v= [];
		for (var i in this.d)
		{
			if (f(this.d[i])) this.v.push(this.d[i]);
		}
	};

	this.filterByParent = function(id)
	{
		this.filterBy(function(node)
		{
		  if ((node.name && node.p == id) || (node.name && node.p && node.p.length == 11 && id == 'shares')) return true;
		});
	};

	this.filterBySearch = function(str)
	{
		str = str.replace('search/','');
		this.filterBy(function(node)
		{
		  if (node.name && str && node.name.toLowerCase().indexOf(str.toLowerCase()) >= 0) return true;
		});
	};

	this.avatars = function()
	{
		if (!M.c.contacts) M.c.contacts = { };
		M.c.contacts[u_handle] = 1;
		
		for (var u in M.c['contacts']) if (!avatars[u])
		{
			api_req({a:'uga',u:u,ua:'+a'},
			{
				u : u,
				callback: function(res,ctx)
				{
					if (typeof res !== 'number')
					{
						var blob = new Blob([str_to_ab(base64urldecode(res))],{ type: 'image/jpeg' });
						avatars[ctx.u] =
						{
							data: blob,
							url: myURL.createObjectURL(blob)
						}
						var el = $('.contact-block-view-avatar.' + ctx.u + ',.avatar.' + ctx.u + ',.contacts-avatar.' + ctx.u);
						if (el.length > 0) el.find('img').attr('src',avatars[ctx.u].url);
						
						var el = $('#contact_' + ctx.u);						
						if (el.length > 0) el.find('img').attr('src',avatars[ctx.u].url);

						if (u_handle == ctx.u) $('.fm-avatar img,.fm-account-avatar img').attr('src',avatars[ctx.u].url);
					}
				}
			});
		}
		
		delete M.c.contacts[u_handle];
	}

	this.renderAvatars = function()
	{
		$('.contact-block-view-avatar').each(function(i,e)
		{
			var c = $(e).attr('class');
		});

		$('.avatar').each(function(i,e)
		{
			var c = $(e).attr('class');
		});
	}

	this.contactstatus = function(h)
	{
		var folders=0;
		var files=0;
		var ts=0;
		if (M.d[h])
		{
			var a = fm_getnodes(h);
			for (var i in a)
			{
				var n = M.d[a[i]];
				if (n)
				{
					if (ts < n.ts) ts=n.ts;
					if (n.t) folders++;
					else  files++;
				}
			}
		}
		return {files:files,folders:folders,ts:ts};
	};

	this.renderMain = function(u)
	{
		hideEmptyMsg();
		var jsp = $('.file-block-scrolling').data('jsp');
		if (jsp) jsp.destroy();
		var jsp = $('.contacts-blocks-scrolling').data('jsp');
		if (jsp) jsp.destroy();
		if (!u)
		{
			$('.grid-table.fm tr').remove();
			$('.file-block-scrolling div').remove();
			$('.file-block-scrolling a').remove();
			$('.contacts-blocks-scrolling div').remove();
			$('.contacts-grid-table tr').not('.clone-of-header').remove();
		}
		if (this.v.length == 0)
		{
			if (M.currentdirid == M.RubbishID) $('.fm-empty-trashbin').removeClass('hidden');
			else if (M.currentdirid == 'contacts') $('.fm-empty-contacts').removeClass('hidden');
			else if (M.currentdirid.substr(0,7) == 'search/') $('.fm-empty-search').removeClass('hidden');
			else if (M.currentdirid == M.RootID) $('.fm-empty-cloud').removeClass('hidden');
			else if (M.currentdirid == M.InboxID) $('.fm-empty-messages').removeClass('hidden');
		}

		for (var i in this.v)
		{
			if (this.v[i].name)
			{
				var s='';
				var t = '';
				var c = '';
				if (this.v[i].t)
				{
					t = l[1049];
					c = ' folder';
				}
				else
				{
					t = filetype(this.v[i].name);
					s = htmlentities(bytesToSize(this.v[i].s));
				}
				var html,t,el,star='';
				if (this.v[i].fav) star = ' star';
				if (this.viewmode == 1)
				{
					if (this.currentdirid == 'contacts')
					{
						var avatar = staticpath + 'images/mega/default-avatar.png';
						if (avatars[this.v[i].h]) avatar = avatars[this.v[i].h].url;
						el = 'div';
						t = '.contacts-blocks-scrolling';
						html = '<div id="' + htmlentities(this.v[i].h) + '" class="contact-block-view"><span class="contact-status no-status"></span><div class="contact-block-view-avatar '+this.v[i].h+'"><span><img alt="" src="' + avatar + '" /></span></div><div class="contact-block-view-name">' + htmlentities(this.v[i].name) + '</div></div>';						
					}
					else
					{
						t = '.file-block-scrolling';
						el = 'a';
						html = '<a class="file-block' + c + '" id="' + htmlentities(this.v[i].h) + '"><span class="file-status-icon'+star+'"></span><span class="file-settings-icon"></span><span class="file-icon-area"><span class="block-view-file-type '+ fileicon(this.v[i]) + '"><img alt="" /></span></span><span class="file-block-title">' + htmlentities(this.v[i].name) + '</span></a>';
					}
				}
				else
				{
					el='tr';
					if (this.currentdirid == 'contacts')
					{
						var cs = this.contactstatus(this.v[i].h);
						var contains = fm_contains(cs.files,cs.folders);
						var time = time2last(cs.ts);
						if (cs.files == 0 && cs.folders == 0)
						{
							contains = l[1050];
							time = l[1051];
						}

						var avatar = staticpath + 'images/mega/default-avatar.png';
						if (avatars[this.v[i].h]) avatar = avatars[this.v[i].h].url;

						html = '<tr id="' + htmlentities(this.v[i].h) + '"><td><span class="contacts-avatar ' + this.v[i].h + '"><span><img src="' + avatar + '" alt=""/></span></span><span class="contacts-username">' + htmlentities(this.v[i].name) + '</span></td><td width="130" class="hidden"><span class="contact-status online-status"></span><span class="contact-status-text">Online</span></td><td  width="200">' + htmlentities(contains) + '</td><td width="200">' + htmlentities(time) + '</td></tr>';
						t = '.contacts-grid-table';
					}
					else
					{
						html = '<tr id="' + htmlentities(this.v[i].h) + '" class="' + c + '"><td width="30"><span class="grid-status-icon'+star+'"></span></td><td><span class="transfer-filtype-icon ' + fileicon(this.v[i]) + '"> </span><span class="tranfer-filetype-txt">' + htmlentities(this.v[i].name) + '</span></td><td width="100">' + s + '</td><td width="130">' + t + '</td><td width="120">' + time2date(this.v[i].ts) + '</td><td width="60" class="grid-url-field"><a href="" class="grid-url-arrow"></a></td></tr>';
						t = '.grid-table.fm';
					}
				}
				if (!u || $(t + ' '+el).length == 0)
				{
					// if the current view does not have any nodes, just append it
					$(t).append(html);
				}
				else if (u && $(t+' #'+this.v[i].h).length == 0 && this.v[i-1] && $(t+' #'+this.v[i-1].h).length > 0)
				{
					// if there is a node before the new node in the current view, add it after that node:
					$(t+' #'+this.v[i-1].h).after(html);
				}
				else if (u && $(t+' #'+this.v[i].h).length == 0 && this.v[i+1] &&  $(t+' #'+this.v[i+1].h).length > 0)
				{
					// if there is a node after the new node in the current view, add it before that node:
					$(t+' #'+this.v[i+1].h).before(html);
				}
				else if ($(t+' #'+this.v[i].h).length == 0 && this.v[i].t)
				{
					// new folder: insert new node before the first folder in the current view
					$($(t+' '+el)[0]).before(html);
				}
				else if ($(t+' #'+this.v[i].h).length == 0 && !this.v[i].t)
				{
					// new file: insert new node before the first file in the current view
					var a = $(t+' '+el).not('.folder');
					if (a.length > 0) $(a[0]).before(html);
					else
					{
						// if this view does not have any files, insert after the last folder
						a = $(t+' '+el);
						$(a[a.length-1]).after(html);
					}
				}				
			}
		}
		$('.grid-url-arrow').unbind('click');
		$('.grid-url-arrow').bind('click',function(e)
		{
			var target = $(this).closest('tr');
			if (target.attr('class').indexOf('ui-selected') == -1) {
				target.parent().find('tr').removeClass('ui-selected');
			}
			target.addClass('ui-selected');
			e.preventDefault(); e.stopPropagation(); // do not treat it as a regular click on the file
			e.currentTarget = target;
			cacheselect();
			searchPath();
			contextmenuUI(e,1);
		});

		if (this.viewmode == 1)
		{
			$('.file-block-scrolling').append('<div class="clear"></div>');
			iconUI();
			fa_duplicates = {};
			fm_thumbnails();
		}
		else gridUI();
		fmtopUI();
	};

	this.renderShare = function(h)
	{
		var html ='';
		if (M.d[h].shares)
		{
			for(var u in M.d[h].shares)
			{
				if (M.u[u])
				{
					var rt='';
					var sr={r0:'',r1:'',r2:''};
					if (M.d[h].shares[u].r == 0)
					{
						rt = l[55];
						sr.r0 = ' active';
					}
					else if (M.d[h].shares[u].r == 1)
					{
						rt = l[56];
						sr.r1 = ' active';
					}
					else if (M.d[h].shares[u].r == 2)
					{
						rt = l[57];
						sr.r2 = ' active';
					}

					var avatar = staticpath + 'images/mega/default-avatar.png';
					if (avatars[M.u[u].h]) avatar = avatars[M.u[u].h].url;

					html += '<div class="add-contact-item" id="' + u + '"><div class="add-contact-pad"><span class="avatar ' + M.u[u].h + '"><span><img src="' + avatar + '" alt=""/></span></span><span class="add-contact-username">'+ htmlentities(M.u[u].m)+'</span><div class="fm-share-dropdown">'+rt+'</div><div class="fm-share-permissions-block hidden"><div class="fm-share-permissions'+sr.r0+'" id="rights_0">' + l[55] + '</div><div class="fm-share-permissions'+sr.r1+'" id="rights_1">' + l[56] + '</div><div class="fm-share-permissions'+sr.r2+'" id="rights_2">' + l[57] + '</div><div class="fm-share-permissions" id="rights_3">' + l[83] + '</div></div></div></div>';
				}
			}
			$('.share-dialog .fm-shared-to').html(html);
			$('.share-dialog .fm-share-empty').addClass('hidden');
			$('.share-dialog .fm-shared-to').removeClass('hidden');
		}
		else
		{
			$('.share-dialog .fm-share-empty').removeClass('hidden');
			$('.share-dialog .fm-shared-to').addClass('hidden');
		}
	};

	this.renderTree = function()
	{
		this.buildtree({h:'shares'});		
		this.buildtree(this.d[this.RootID]);
		this.contacts();
		treeUI();
	};
	
	this.renderContacts = function()
	{
		$('#treesub_contacts').html('');
		this.buildtree({h:'contacts'});
		treeUI();
	};

	this.openFolder = function(id,force,chat)
	{		
		topContextMenu(1);
		$('.fm-files-view-icon').removeClass('hidden');
		if (d) console.log('openFolder()',M.currentdirid,id);
		if (id !== 'notifications' && $('.fm-main.notifications').attr('class').indexOf('hidden') < 0) notificationsUI(1);
		this.search=false;
		this.chat=false;
		if (!fminitialized)
		{
			fminitialized=true;
			$('.top-search-bl').show();
		}
		else if (id == this.currentdirid && !force) return false;
		if (id == 'rubbish') id = this.RubbishID;
		else if (id == 'inbox') id = this.InboxID;
		else if (id == 'cloudroot') id = this.RootID;
		else if (id == 'contacts') id = 'contacts';
		else if (id == 'shares') id = 'shares';
		else if (id == 'chat')
		{
			id = 'chat';
			//n_h = id; FIXME
		}
		else if (id && id.substr(0,7) == 'account') accountUI();
		else if (id && id.substr(0,13) == 'notifications') notificationsUI();
		else if (id && id.substr(0,7) == 'search/') this.search=true;
		else if (id && id.substr(0,5) == 'chat/') this.chat=true;
		else if (!M.d[id]) id = this.RootID;
		this.currentdirid = id;

			

		if (this.chat)
		{
			treeUIopen(M.currentdirid.replace('chat/',''),1);
			chatui();
			fmtopUI();
			M.renderPath();
		}
		else if (id.substr(0,7) !== 'account' && id.substr(0,13) !== 'notifications')
		{
			$('.fm-right-files-block').removeClass('hidden');
			$('.fm-right-account-block').addClass('hidden');
			
			var tt = new Date().getTime();

			if (id.substr(0,6) == 'search') M.filterBySearch(M.currentdirid);
			else M.filterByParent(M.currentdirid);
			
			

			var viewmode=0;

			if (typeof fmconfig.uiviewmode !== 'undefined' && fmconfig.uiviewmode)
			{
				if (fmconfig.viewmode) viewmode = fmconfig.viewmode;
			}
			else if (typeof fmconfig.viewmodes !== 'undefined' && typeof fmconfig.viewmodes[id] !== 'undefined') viewmode=fmconfig.viewmodes[id];
			else
			{
				for (var i in M.v)
				{
					var ext = fileext(M.v[i].name);
					var images = '|jpg|gif|png|';
					if (images.indexOf('|'+ext+'|') >= 0) viewmode=1;
				}
			}
			M.viewmode=viewmode;

			if (fmconfig.uisorting && fmconfig.sorting) M.doSort(fmconfig.sorting.n,fmconfig.sorting.d);
			else if (fmconfig.sortmodes && fmconfig.sortmodes[id]) M.doSort(fmconfig.sortmodes[id].n,fmconfig.sortmodes[id].d);
			else M.doSort('name',1);
			M.renderMain();
			M.renderPath();
			if (fminitialized && (id.substr(0,6) !== 'search'))
			{
				if ($('treea_'+M.currentdirid).length == 0)
				{
					var n = M.d[M.currentdirid];
					if (n && n.p) treeUIopen(n.p,false,true);
				}
				treeUIopen(M.currentdirid,1);
			}		
			if (d) console.log('time for rendering:',new Date().getTime()-tt);

			setTimeout(function()
			{
				M.renderPath();
			},1);
		}	
		if (!n_h) window.location.hash = '#fm/' + M.currentdirid;
		searchPath();
	};
	
	
	this.runbugfix = function()
	{
		for (var i in M.d)
		{
			if (M.d[i].t && M.d[i].shares)
			{
				var nodes = fm_getnodes(M.d[i].h);
				console.log(nodes);
				
				for (var j in nodes)
				{
					var n = M.d[nodes[j]];
					if (n.name)
					{
						 
						console.log(n.name);
						console.log(n.key);
					}
				}
			}
		}
	};
	
	this.contacts = function()
	{
		var contacts = [];
		for (var i in M.u) if (M.u[i].c) contacts.push(M.u[i]);
		if (localStorage.csort) this.csort = localStorage.csort;
		if (localStorage.csortd) this.csortd= parseInt(localStorage.csortd);
		if (this.csort == 'shares')
		{				
			contacts.sort(function(a,b)
			{
				if (M.c[a.h] && M.c[b.h])
				{
					if (a.name) return a.name.localeCompare(b.name);
				}
				else if (M.c[a.h] && !M.c[b.h]) return 1*M.csortd;
				else if (!M.c[a.h] && M.c[b.h]) return -1*M.csortd;
				return 0;
			});
		}
		else if (this.csort == 'name')
		{				
			contacts.sort(function(a,b)
			{						
				if (a.m) return parseInt(b.m.localeCompare(a.m)*M.csortd);
			});
		}
		var html = '',status='',img;
		// status can be: "online"/"away"/"busy"/"offline"
		for (var i in contacts)
		{						
			var img = staticpath + 'images/mega/default-small-avatar.png';
			if (avatars[contacts[i].u]) img = avatars[contacts[i].u].url;
			html += '<div class="nw-contact-item offline" id="contact_' + htmlentities(contacts[i].u) + '"><div class="nw-contact-status"></div><div class="nw-contact-avatar"><img alt="" src="' + img + '"></div><div class="nw-contact-name">' + htmlentities(contacts[i].m) + '</div></div>';			
		}		
		$('.content-panel.contacts').html(html);
	};

	this.buildtree = function(n)
	{
		if (n.h == M.RootID && $('.content-panel.cloud-drive lu').length == 0)
		{
			$('.content-panel.cloud-drive').html('<ul id="treesub_' + htmlentities(M.RootID) + '"></ul>');
		}
		else if (n.h == 'shares' && $('.content-panel.shared-with-me lu').length == 0)
		{
			$('.content-panel.shared-with-me').html('<ul id="treesub_shares"></ul>');			
		}
		
		if (this.c[n.h])
		{
			var folders = [];
			for(var i in this.c[n.h]) if (this.d[i].t == 1 && this.d[i].name) folders.push(this.d[i]);
			
			// sort by name is default in the tree
			folders.sort(function(a,b)
			{
				if (a.name) return a.name.localeCompare(b.name);
			});
			
			/*
			if (n.h == 'contacts')
			{
				// in case of contacts we have custom sort/grouping:
				if (localStorage.csort) this.csort = localStorage.csort;
				if (localStorage.csortd) this.csortd= parseInt(localStorage.csortd);
				if (this.csort == 'shares')
				{				
					folders.sort(function(a,b)
					{
						if (M.c[a.h] && M.c[b.h])
						{
							if (a.name) return a.name.localeCompare(b.name);
						}
						else if (M.c[a.h] && !M.c[b.h]) return 1*M.csortd;
						else if (!M.c[a.h] && M.c[b.h]) return -1*M.csortd;
						return 0;
					});
				}
				else if (this.csort == 'name')
				{				
					folders.sort(function(a,b)
					{						
						if (a.name) return parseInt(a.name.localeCompare(b.name)*M.csortd);
					});
				}
				
				$('.contacts-sorting-by').removeClass('active');
				$('.contacts-sorting-by.' + this.csort).addClass('active');				
				$('.contacts-sorting-type').removeClass('active');				
				$('.contacts-sorting-type.' + (this.csortd > 0 ? 'asc' : 'desc')).addClass('active');
			}
			*/
			
			for (var i in folders)
			{
				var ulc = '';
				var expandedc = '';
				var buildnode=false;
				
				if (fmconfig && fmconfig.treenodes && fmconfig.treenodes[folders[i].h] && typeof M.c[folders[i].h] !== 'undefined')
				{
					for (var h in M.c[folders[i].h])
					{
						var n2 = M.d[h];						
						if (n2 && n2.t) buildnode = true;
					}
				}
				
				if (buildnode)
				{
					ulc = 'class="opened"';
					expandedc = 'expanded';				
				}
				else if (fmconfig && fmconfig.treenodes && fmconfig.treenodes[folders[i].h]) fmtreenode(folders[i].h,false);
				
				var containsc='';
				var cns = M.c[folders[i].h];						
				if (cns) for (var cn in cns) if (M.d[cn] && M.d[cn].t) containsc = 'contains-folders';				
				
				var html = '<li id="treeli_' + folders[i].h + '"><span class="nw-fm-tree-item ' + containsc + ' ' + expandedc + '" id="treea_'+ htmlentities(folders[i].h) +'"><span class="nw-fm-arrow-icon"></span><span class="nw-fm-tree-folder">' + htmlentities(folders[i].name) + '</span></span><ul id="treesub_' + folders[i].h + '" ' + ulc + '></ul></li>';
				
				if ($('#treeli_'+folders[i].h).length == 0)
				{				
					if (folders[i-1] && $('#treeli_' + folders[i-1].h).length > 0) $('#treeli_' + folders[i-1].h).after(html);					
					else if (i == 0 && $('#treesub_' + n.h + ' li').length > 0) $($('#treesub_' + n.h + ' li')[0]).before(html);				
					else $('#treesub_' + n.h).append(html);					
				}
				if (buildnode) this.buildtree(folders[i]);				
			}
		}
	};

	this.getPath = function(id)
	{
		var a = [];
		var g=1;
		while(g)
		{
			if (M.d[id] || id == 'contacts' || id == 'messages' || id == M.InboxID) a.push(id);
			else return [];
			if (id == this.RootID || id == 'contacts' || id == 'messages' || id == this.RubbishID || id == this.InboxID) g=0;
			if (g) id = this.d[id].p;
		}
		return a;
	};

	this.pathLength = function()
	{
		var length=0;
		var c = $('.fm-new-folder').attr('class');
		if (c && c.indexOf('hidden') < 0) length += $('.fm-new-folder').width();
		var c = $('.fm-folder-upload').attr('class');
		if (c && c.indexOf('hidden') < 0) length += $('.fm-folder-upload').width();
		var c = $('.fm-file-upload').attr('class');
		if (c && c.indexOf('hidden') < 0) length += $('.fm-file-upload').width();
		var c = $('.fm-clearbin-button').attr('class');
		if (c && c.indexOf('hidden') < 0) length += $('.fm-clearbin-button').width();
		var c = $('.fm-add-user').attr('class');
		if (c && c.indexOf('hidden') < 0) length += $('.fm-add-user').width();
		length += $('.fm-breadcrumbs-block').width();
		length += $('.fm-back-button').width();
		return length;
	};

	this.renderPath = function()
	{
		var hasnext='', typeclass;
		var html = '<div class="clear"></div>';
		var a = this.getPath(this.currentdirid);
		for (var i in a)
		{
			if (a[i] == this.RootID)
			{
				if (folderlink && M.d[this.RootID])
				{
					name = htmlentities(M.d[this.RootID].name);
					typeclass = 'folder';
				}
				else
				{
					name = l[164];
					typeclass = 'cloud-drive';
				}
			}
			else if (a[i] == 'contacts')
			{
				typeclass = 'contacts';
				name = l[165];
			}
			else if (a[i] == this.RubbishID)
			{
				typeclass = 'recycle-bin';
				name = l[167];
			}
			else if (a[i] == 'messages' || a[i] == M.InboxID)
			{
				typeclass = 'messages';
				name = l[166];
			}
			else
			{
				name = htmlentities(this.d[a[i]].name);
				typeclass = 'folder';
			}
			html = '<a class="fm-breadcrumbs ' + typeclass + ' contains-directories ' + hasnext + ' ui-droppable" id="path_'+htmlentities(a[i])+'"><span class="right-arrow-bg ui-draggable"><span>' +  name + '</span></span></a>' + html;
			hasnext = 'has-next-button';
		}

		if (this.currentdirid && this.currentdirid.substr(0,5) == 'chat/')
		{			
			$('.fm-breadcrumbs-block').html('<a class="fm-breadcrumbs contacts contains-directories has-next-button" id="path_contacts"><span class="right-arrow-bg"><span>Contacts</span></span></a><a class="fm-breadcrumbs chat" id="chatcrumb"><span class="right-arrow-bg"><span>Andrei.d</span></span></a>');
			
			$('.search-files-result').addClass('hidden');						
		}
		else if (this.currentdirid && this.currentdirid.substr(0,7) == 'search/')
		{
			$('.fm-breadcrumbs-block').html('<a class="fm-breadcrumbs search contains-directories ui-droppable" id="'+htmlentities(a[i])+'"><span class="right-arrow-bg ui-draggable"><span>' +  htmlentities(this.currentdirid.replace('search/',''))	+ '</span></span></a>');
			$('.search-files-result .search-number').text(M.v.length);
			$('.search-files-result').removeClass('hidden');			
			$('.search-files-result').addClass('last-button');
		}
		else 
		{
			$('.search-files-result').addClass('hidden');
			$('.fm-breadcrumbs-block').html(html);
		}
		$('.fm-new-folder span').text(l[68]);
		$('.fm-file-upload span').text(l[99]);
		$('.fm-folder-upload span').text(l[98]);

		$('.fm-right-header').removeClass('long-path');
		if (M.pathLength()+260 > $('.fm-right-header').width())
		{
			$('.fm-right-header').addClass('long-path');
			$('.fm-new-folder span').text('');
			$('.fm-file-upload span').text('');
			$('.fm-folder-upload span').text('');
		}

		var el = $('.fm-breadcrumbs-block .fm-breadcrumbs span span');
		var i =0;

		while (M.pathLength()+260 > $('.fm-right-header').width() && i < el.length)
		{
			$(el[i]).text('');
			i++;
		}
		$('.fm-breadcrumbs-block a').unbind('click');
		$('.fm-breadcrumbs-block a').bind('click',function(event)
		{
			if ($(this).attr('id') == 'chatcrumb') return false;
			else if (M.currentdirid && M.currentdirid.substr(0,7) == 'search/') return false;
			M.openFolder($(this).attr('id').replace('path_',''));
		});
	};

	this.getById = function(id)
	{
		if (this.d[id]) return this.d[id];
		else return false;
	};

	this.addNode = function(n,ignoreDB)
	{
		if (!this.c['shares']) this.c['shares'] = [];
		if (!M.d[n.p] && n.p !== 'contacts')
		{
			if (n.sk) n.p = n.u;
			else if (n.su) n.p = n.su;
		}
		if (n.p && n.p.length == 11 && !M.d[n.p])
		{
			var u = this.u[n.p];
			if (u)
			{
				u.name = u.m;
				u.h = u.u;
				u.t=1;
				u.p = 'contacts';
				M.addNode(u);
			}
			else console.log('something went wrong!',n.p,this.u[n.p]);
		}
		if (mDB && !ignoreDB && !pfkey) mDBadd('f',clone(n));
		if (n.p)
		{			
			if (typeof this.c[n.p] == 'undefined') this.c[n.p] = [];
			this.c[n.p][n.h]=1;
			// maintain special incoming shares index:
			if (n.p.length == 11) this.c['shares'][n.h]=1;			
		}
		
		if (n.t == 2) this.RootID 		= n.h;
		if (n.t == 3) this.InboxID 		= n.h;
		if (n.t == 4) this.RubbishID 	= n.h;
		if (!n.c)
		{
			if (n.sk) u_sharekeys[n.h] = crypto_process_sharekey(n.h,n.sk);
			
			if (n.t !== 2 && n.t !== 3 && n.t !== 4 && n.k)
			{
				crypto_processkey(u_handle,u_k_aes,n);
				u_nodekeys[n.h] = n.key;
			}
			else if (!n.k)
			{
				if (n.a)
				{
				  if (!missingkeys[n.h])
				  {
					missingkeys[n.h] =true;
					newmissingkeys = true;
				  }
				}
			}			
			if (n.hash)
			{
				if (!this.h[n.hash]) this.h[n.hash]=[];
				this.h[n.hash].push(n.h);
			}
		}
		if (this.d[n.h] && this.d[n.h].shares) n.shares = this.d[n.h].shares;
		this.d[n.h] = n;
		if (typeof newnodes !== 'undefined') newnodes.push(n);
	};

	this.delNode = function(h)
	{
		var a =0;
		function ds(h)
		{
			removeUInode(h);
			if (M.c[h] && h.length < 11)
			{
				for(var h2 in M.c[h]) ds(h2);
				delete M.c[h];
			}
			if (mDB && !pfkey) mDBdel('f',h);
			if (M.d[h])
			{
				M.delIndex(M.d[h].p,h);				
				M.delHash(M.d[h]);				
				delete M.d[h];
			}
			if (M.v[h]) delete M.v[h];			
		}
		ds(h);
	};
	
	this.delHash = function(n)
	{
		if (n.hash && M.h[n.hash])
		{
			for (var i in M.h[n.hash])
			{
				if (M.h[n.hash][i] == n.h) 
				{
					M.h[n.hash].splice(i,1);
					break;
				}
			}			
			if (M.h[n.hash].length == 0) delete M.h[n.hash];
		}
	}

	this.addContact = function(email)
	{
		api_req({a:'ur',u:email,l:'1',i:requesti},
		{
		  callback : function (res,params)
		  {
			if (typeof res == 'object')
			{
				if (res.u)
				{
					newnodes=[];
					process_u([{ c: 1, m: res.m, h:res.u, u: res.u, ts: (new Date().getTime()/1000) }],false);
					rendernew();
				}
			}
			else if ((res == 0) || (res == -303))
			{
				var talready='';
				if (res == -303) talready = 'already ';
				msgDialog('info',l[150],l[151].replace('[X]',talready));
			}
			else if (res == -2) msgDialog('info',l[135],l[152]);
			$('.add-user-popup input').val('');
			loadingDialog.hide();
		  }
		});
	};

	this.clearRubbish = function(sel)
	{
		var selids = [];
		if (sel && $.selected) for (var i in $.selected) selids[$.selected[i]]=1;

		for (var h in M.c[M.RubbishID])
		{
			if (!sel || selids[h])
			{
				this.delNode(h);
				api_req({a:'d',n:h,i:requesti});
				if (sel)
				{
					$('.grid-table.fm#'+h).remove();
					$('.file-block#'+h).remove();
				}
			}
		}
		var hasFolders=false;
		if (sel) for (var h in M.c[M.RubbishID]) if (M.d[h].t) hasFolders=true;
		if (!hasFolders)
		{
			$('#treesub_' + M.RubbishID).remove();
			$('.fm-tree-header.recycle-item').removeClass('contains-subfolders expanded recycle-notification');
			if (this.RubbishID == this.currentdirid)
			{
				$('.grid-table.fm tr').remove();
				$('.file-block').remove();
				$('.fm-empty-trashbin').removeClass('hidden');
			}
		}
		if (this.RubbishID == this.currentdirid)
		{
			if (M.viewmode) iconUI();
			else gridUI();
		}
		this.rubbishIco();
		treeUI();
	}

	this.addUser = function(u,ignoreDB)
	{
		this.u[u.u]=u;
		if (mDB && !ignoreDB && !pfkey) mDBadd('u',clone(u));
	};

	this.copyNodes = function(cn,t,del)
	{
		loadingDialog.show();
		if (t.length == 11 && !u_pubkeys[t])
		{
			api_cachepubkeys({
				cachepubkeyscomplete : function(ctx)
				{
					if (u_pubkeys[ctx.t]) M.copyNodes(ctx.cn,ctx.t);
					else
					{
						loadingDialog.hide();
						alert(l[200]);
					}
				},
				cn: cn,
				t: t
			},[t]);
			return false;
		}

		var a=[];
		var r=[];
		for (var i in cn)
		{
			var s = fm_getnodes(cn[i]);
			for (var j in s) r.push(s[j]);
			r.push(cn[i]);
		}
		for(var i in r)
		{
			var n = M.d[r[i]];
			if (n)
			{
				var ar = clone(n.ar);
				if (typeof ar.fav !== 'undefined') delete ar.fav;
				var mkat = enc_attr(ar,n.key);
				var attr = ab_to_base64(mkat[0]);
				var key;
				if (t.length == 11) key = base64urlencode(encryptto(t,a32_to_str(mkat[1])));
				else key = a32_to_base64(encrypt_key(u_k_aes,mkat[1]));
				var nn = {h:n.h,t:n.t,a:attr,k:key};
				var p=n.p;
				for (var j in cn) if (cn[j] == nn.h) p=false;
				if (p) nn.p=p;
				a.push(nn);
			}
		}
		var ops = {a:'p',t:t,n:a,i:requesti};
		var s = fm_getsharenodes(t);
		if (s.length > 0)
		{
			var mn = [];
			for (i in a) mn.push(a[i].h);
			ops.cr = crypto_makecr(mn,s,true);
		}
		api_req(ops,
		{
			cn:cn,
			del:del,
			t:t,
			callback : function (res,ctx)
			{
				if (ctx.del)
				{
					var j =[];
					for (var i in ctx.cn)
					{
						M.delNode(ctx.cn[i]);									
						api_req({a:'d',n:cn[i],i:requesti});
					}					
				}		
				newnodes = [];
				if (res.u) process_u(res.u,true);
				if (res.f) process_f(res.f);
				loadingDialog.hide();
				rendernew();
			}
		});
	};

	this.moveNodes = function(n,t)
	{
		newnodes=[];
		var j = [];
		for (var i in n)
		{
			var h = n[i];
			j.push(
			{
				a: 'm',
				n: 	h,
				t: 	t,
				i:  requesti
			});
			if (M.d[h] && M.d[h].p)
			{
				if (M.c[M.d[h].p] && M.c[M.d[h].p][h]) delete M.c[M.d[h].p][h];				
				if (typeof M.c[t] == 'undefined') M.c[t]=[];
				M.c[t][h]=1;
				removeUInode(h);
				this.nodeAttr({h:h,p:t});
				newnodes.push(M.d[h]);
			}
		}
		rendernew();
		this.rubbishIco();
		processmove(j);
	}

	this.accountData = function(cb,blockui)
	{
		if (this.account && this.account.lastupdate > new Date().getTime()-300000 && cb) cb(this.account);
		else
		{
			if (blockui) loadingDialog.show();
			
			account = { };

			api_req({a:'uq',strg:1,xfer:1,pro:1},{
				account : account,
				callback: function(res,ctx)
				{
					loadingDialog.hide();

					if (typeof res == 'object')
					{
						ctx.account.type = res.utype;
						ctx.account.stype = res.stype;
						ctx.account.stime = res.scycle;
						ctx.account.scycle = res.snext;
						ctx.account.expiry = res.suntil;
						ctx.account.space = Math.round(res.mstrg);
						ctx.account.space_used = Math.round(res.cstrg);
						ctx.account.bw = Math.round(res.mxfer);
						ctx.account.servbw_used = Math.round(res.csxfer);
						ctx.account.downbw_used = Math.round(res.caxfer);
						ctx.account.servbw_limit = res.srvratio;
						ctx.account.balance = res.balance;
						ctx.account.reseller = res.reseller;
						ctx.account.prices = res.prices;
						
						if (res.balance.length == 0) ctx.account.balance = [['0.00','EUR']];					

						if (!u_attr.p)
						{
							ctx.account.servbw_used = 0;

							if (res.tah)
							{
								var t = 0;

								for (var i in res.tah) t += res.tah[i];

								ctx.account.downbw_used = t;
								ctx.account.bw = res.tal;
							}
						}
					}
				}
			});

			api_req({a:'uavl'},{
				account : account,
				callback: function(res,ctx)
				{
					if (typeof res != 'object') res = [];
					ctx.account.vouchers = voucherData(res);
				}
			});

			api_req({a:'utt'},{
				account : account,
				callback: function(res,ctx)
				{
					if (typeof res != 'object') res = [];				
					ctx.account.transactions = res;
				}
			});

			api_req({a:'utp'},{
				account : account,
				callback: function(res,ctx)
				{
					if (typeof res != 'object') res = [];
					ctx.account.purchases = res;
				}
			});

			api_req({a:'usl'},{
				account : account,
				callback: function(res,ctx)
				{
					if (typeof res != 'object') res = [];
					ctx.account.sessions = res;
				}
			});

			api_req({a:'ug'},{
				cb : cb,
				account : account,
				callback: function(res,ctx)
				{
					if (typeof res == 'object')
					{
						if (res.p)
						{
							u_attr.p = res.p;
							if (u_attr.p) topmenuUI();
						}
					}
					
					ctx.account.lastupdate = new Date().getTime();

					if (!ctx.account.bw) ctx.account.bw = 1024*1024*1024*10;
					if (!ctx.account.servbw_used) ctx.account.servbw_used = 0;
					if (!ctx.account.downbw_used) ctx.account.downbw_used = 0;

					M.account = ctx.account;
					
					if (ctx.cb) ctx.cb(ctx.account);
				}
			});
		}
	}

	this.delIndex = function(p,h)
	{
		if (M.c[p] && M.c[p][h]) delete M.c[p][h];
		var a=0;
		for (var i in M.c[p]) a++;
		if (a == 0)
		{
			delete M.c[p];
			$('#treea'+p).removeClass('contains-folders');
		}
	}

	this.rubbishIco = function()
	{
		var i=0;
		if (typeof M.c[M.RubbishID] !== 'undefined') for (var a in M.c[M.RubbishID]) i++;
		if (i > 0) $('.fm-tree-header.recycle-item').addClass('recycle-notification contains-subfolders');
		else
		{
			$('.fm-tree-header.recycle-item').removeClass('recycle-notification expanded contains-subfolders');
			$('.fm-tree-header.recycle-item').prev('.fm-connector-first').removeClass('active');
		}
	}

	this.nodeAttr = function(a)
	{
		var n = M.d[a.h];
		if (n)
		{
			for (var i in a) n[i]=a[i];
			if (mDB && !pfkey) mDBadd('f',clone(n));
		}
	}

	this.rename = function(h,name)
	{
		if (M.d[h])
		{
			var n = M.d[h];
			if (n && n.ar)
			{
				n.ar.n = name;
				var mkat = enc_attr(n.ar,n.key);
				var attr = ab_to_base64(mkat[0]);
				var key = a32_to_base64(encrypt_key(u_k_aes,mkat[1]));
				M.nodeAttr({h:h,name:name,a:attr});
				api_req({a:'a',n:h,attr:attr,key:key,i:requesti});
				$('.grid-table.fm #' + h + ' .tranfer-filetype-txt').text(name);
				$('.file-block#' + h + ' .file-block-title').text(name);
				$('#treea_' + h + ' span').text(name);
				if ($('#path_' + h).length > 0) M.renderPath();
			}
		}
	}

	this.favourite = function(h_ar,del)
	{
		if (del) del=0;
		else del=1;

		for (var i in h_ar)
		{
			if (M.d[h_ar[i]])
			{
				var n = M.d[h_ar[i]];
				if (n && n.ar)
				{
					n.ar.fav = del;
					var mkat = enc_attr(n.ar,n.key);
					var attr = ab_to_base64(mkat[0]);
					var key = a32_to_base64(encrypt_key(u_k_aes,mkat[1]));
					M.nodeAttr({h:n.h,fav:del,a:attr});
					api_req({a:'a',n:n.h,attr:attr,key:key,i:requesti});
					if (!m)
					{
						if (del)
						{
							$('.grid-table.fm #' + n.h + ' .grid-status-icon').addClass('star');
							$('.file-block#' + n.h + ' .file-status-icon').addClass('star');
						}
						else
						{
							$('.grid-table.fm #' + n.h + ' .grid-status-icon').removeClass('star');
							$('.file-block#' + n.h + ' .file-status-icon').removeClass('star');
						}
					}
				}
			}
		}
	}

	this.nodeShare = function(h,s,ignoreDB)
	{		
		if (this.d[h])
		{
			if (typeof this.d[h].shares == 'undefined') this.d[h].shares = [];
			this.d[h].shares[s.u] = s;
			if (mDB)
			{
				s['h_u'] = h + '_' + s.u;
				if (mDB && !ignoreDB && !pfkey) mDBadd('s',clone(s));
			}
			sharedUInode(h,1);
			if ($.dialog == 'sharing' && $.selected && $.selected[0] == h) shareDialog();
			if (mDB && !pfkey) mDBadd('ok',{h:h,k:a32_to_base64(encrypt_key(u_k_aes,u_sharekeys[h])),ha:crypto_handleauth(h)});
		}
	}

	this.delnodeShare = function(h,u)
	{
		console.log('delnodeShare');

		
		if (this.d[h] && typeof this.d[h].shares !== 'undefined')
		{
			delete this.d[h].shares[u];
			var a = 0;
			for (var i in this.d[h].shares) if (this.d[h].shares[i]) a++;
			if (a == 0)
			{
				delete this.d[h].shares;
				M.nodeAttr({h:h,shares:undefined});
				delete u_sharekeys[h];
				sharedUInode(h,0);
				if (mDB) mDBdel('ok',h);
			}
			if (mDB) mDBdel('s',h + '_' + u);
			if ($.dialog == 'sharing' && $.selected && $.selected[0] == h) shareDialog();
		}
	}

	this.getlinks = function(h)
	{
		loadingDialog.show();
		this.links = [];
		this.folderlinks = [];
		for (var i in h)
		{
			var n = M.d[h[i]];
			if (n)
			{
				if (n.t) this.folderlinks.push(n.h);
				this.links.push(n.h);
			}
		}
		if (d) console.log('getlinks',this.links);
		if (this.folderlinks.length > 0) this.getFolderlinks();
		else this.getlinksDone();
	}

	this.getlinksDone = function()
	{
		for (var i in this.links) api_req({a:'l',n:this.links[i]},{
			node : this.links[i],
			last : i == this.links.length-1,
			callback : function(res,ctx)
			{
				if (typeof res != 'number') M.nodeAttr({h:M.d[ctx.node].h,ph:res});

				if (ctx.last)
				{
					linksDialog();
					loadingDialog.hide();
				}
			}
		});
	}

	this.getFolderlinks = function()
	{
		if (this.folderlinks.length > 0)
		{
			var n = M.d[this.folderlinks[0]];
			this.folderlinks.splice(0,1);

			if (n)
			{
				this.fln=n;
				if (n.shares && n.shares['EXP']) this.getFolderlinks();
				else
				{
					var h = fm_getnodes(n.h);
					h.push(n.h);

					api_setshare(n.h,[{u:'EXP',r:0}],h,
					{
						done : function(res)
						{
							if (res.r && res.r[0] == 0) M.nodeShare(M.fln.h,{h:M.fln.h,r:0,u:'EXP',ts:Math.floor(new Date().getTime()/1000)});
							M.getFolderlinks();
						}
					});
				}
			}
			else this.getFolderlinks();
		}
		else this.getlinksDone();
	}

	this.makeDir = function(n)
	{
		if (is_chrome_firefox & 4) return;

		var dirs = [];
		function getfolders(d,o) 
		{
			var c = 0;
			for (var e in M.d) 
			{
				if(M.d[e].t == 1 && M.d[e].p == d) 
				{
					var p = o || [];
					if (!o) p.push(fm_safename(M.d[d].name));
					p.push(fm_safename(M.d[e].name));
					if (!getfolders(M.d[e].h,p)) dirs.push(p);
					++c;
				}
			}
			return c;
		}
		getfolders(n);

		if (d) console.log('makedir',dirs);

		if(is_chrome_firefox) 
		{
			var root = mozGetDownloadsFolder();
			if (root) dirs.forEach(function(p) 
			{
				try 
				{
					p = mozFile(root,0,p);
					if(!p.exists()) p.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt("0755",8));
				} 
				catch(e) 
				{
					Cu.reportError(e);
					console.log('makedir', e.message);
				}
			});
		} 
		else 
		{
			if (d) console.log('MAKEDIR: TODO');
		}
	}

	this.addDownload = function(n,z,preview)
	{
		// todo cesar: preview parameter indicates that this is a image preview download
		delete $.dlhash;
		var zipname,path;
		var nodes = [];
		var paths={};
		for (var i in n)
		{
			if (M.d[n[i]])
			{
				if (M.d[n[i]].t)
				{
					if(!z) this.makeDir(n[i]);
					var subids = fm_getnodes(n[i]);					
					for(var j in subids)
					{
						var p = this.getPath(subids[j]);
						var path = '';
						
						for(var k in p)
						{
							if (p[k],M.d[p[k]].t) path = fm_safename(M.d[p[k]].name) + '/' + path;
							if (p[k] == n[i]) break;
						}
						
						if (!M.d[subids[j]].t)
						{
							nodes.push(subids[j]);
							paths[subids[j]]=path;							
						}
						else console.log('0 path',path);
					}
				}
				else
				{
					nodes.push(n[i]);
				}
			}
		}

		if (z)
		{
			zipid++;
			z=zipid;
			if (M.d[n[0]] && M.d[n[0]].t) zipname = M.d[n[0]].name + '.zip';
			else zipname = 'Archive-'+ Math.random().toString(16).slice(-4) + '.zip';
			var zipsize = 0;
		}
		else z = false;
		if (!$.totalDL) $.totalDL=0;
		for (var i in nodes)
		{
			n = M.d[nodes[i]];
			if (paths[nodes[i]]) path = paths[nodes[i]];
			else path ='';
			$.totalDL+=n.s;
			var li = $('.transfer-table #' + 'dl_'+htmlentities(n.h));
			if (li.length == 0)
			{
				dl_queue.push(
				{
					id: n.h,
					key: n.key,
					n: n.name,
					t: n.ts,
					p: path,
					size: n.s,
					onDownloadProgress: this.dlprogress,
					onDownloadComplete: this.dlcomplete,
					onBeforeDownloadComplete: this.dlbeforecomplete,
					onDownloadError: this.dlerror,
					onDownloadStart: this.dlstart,
					zipid: z,
					zipname: zipname,
					preview: preview
				});
				zipsize += n.s;

				var flashhtml='';
				if (dlMethod == FlashIO) {
					flashhtml = '<object width="1" height="1" id="dlswf_'+ htmlentities(n.h) + '" type="application/x-shockwave-flash"><param name=FlashVars value="buttonclick=1" /><param name="movie" value="' + document.location.origin + '/downloader.swf"/><param value="always" name="allowscriptaccess"><param name="wmode" value="transparent"><param value="all" name="allowNetworking"></object>';
				}

				if (!z) $('.transfer-table').append('<tr id="dl_'+htmlentities(n.h)+'"><td><span class="transfer-filtype-icon ' + fileicon(n) +'"></span><span class="tranfer-filetype-txt">' + htmlentities(n.name) + '</span></td><td>' + bytesToSize(n.s) + '</td><td><span class="transfer-type download">' + l[373] + '</span>' + flashhtml + '</td><td><span class="transfer-status queued">Queued</span></td><td></td><td></td><td></td><td class="grid-url-field"><a href="" class="grid-url-arrow"></a></td></tr>');
			}
		}

		if (dlMethod == MemoryIO && !localStorage.firefoxDialog && $.totalDL > 104857600) setTimeout(firefoxDialog,1000);		

		var flashhtml='';
		if (dlMethod == FlashIO) {
			flashhtml = '<object width="1" height="1" id="dlswf_zip_'+ htmlentities(z) + '" type="application/x-shockwave-flash"><param name=FlashVars value="buttonclick=1" /><param name="movie" value="' + document.location.origin + '/downloader.swf"/><param value="always" name="allowscriptaccess"><param name="wmode" value="transparent"><param value="all" name="allowNetworking"></object>';
		}
		if (z) $('.transfer-table').append('<tr id="zip_'+zipid+'"><td><span class="transfer-filtype-icon ' + fileicon({name:'archive.zip'}) + '"></span><span class="tranfer-filetype-txt">' + htmlentities(zipname) + '</span></td><td>' + bytesToSize(zipsize) + '</td><td><span class="transfer-type download">' + l[373] + '</span>'+ flashhtml +'</td><td><span class="transfer-status queued">Queued</span></td><td></td><td></td><td></td><td class="grid-url-field"><a href="" class="grid-url-arrow"></a></td></tr>');
//		$('.tranfer-view-icon').addClass('active');
//		$('.fmholder').addClass('transfer-panel-opened');
//		$.transferHeader();

        if (!preview) 
		{
			openTransferpanel();
			initGridScrolling();
			initFileblocksScrolling();
			initTreeScroll();
		}

		delete $.dlhash;
	}

	this.dlprogress = function (id, perc, bl, bt,kbps, dl_queue_num)
	{
		var st;
		if (dl_queue[dl_queue_num].zipid)
		{
			id = 'zip_' + dl_queue[dl_queue_num].zipid;
			var tl=0;
			var ts=0;
			for (var i in dl_queue)
			{
				if (dl_queue[i].zipid == dl_queue[dl_queue_num].zipid)
				{
					if (!st) st = dl_queue[i].st;
					ts+=dl_queue[i].size;
					if (dl_queue[i].complete) tl+=dl_queue[i].size;
				}
			}
			bt = ts;
			bl = tl + bl;
		}
		else
		{
			id = 'dl_' + id;
			st = dl_queue[dl_queue_num].st;
		}

		var failed = parseInt($('#' + id).data('failed') || "0");
		// failed not long ago
		if (failed+30000 > NOW()) return;

		if ($('.transfer-table #' + id + ' .progress-block').length == 0) {
			$('.transfer-table #' + id + ' td:eq(3)').html('<div class="progress-block" style=""><div class="progressbar"><div class="progressbarfill" style="width:0%;"></div></div></div>');
			$.transferHeader();
		}

		if (!bl) return false;
		if (!$.transferprogress) $.transferprogress={};
		if (kbps == 0) {
			if (perc != 100 || $.transferprogress[id]) return false;
			kbps = bl;
		}
		var eltime = (new Date().getTime()-st)/1000;
		var bps = kbps*1000;
		var retime = (bt-bl)/bps;
		if (bl && bt)
		{
			// $.transferprogress[id] = Math.floor(bl/bt*100);
			$.transferprogress[id] = [bl,bt];
			if (!uldl_hold)
			{
				if (slideshowid == dl_queue[dl_queue_num].id && !previews[slideshowid])
				{					
					$('.slideshow-error').addClass('hidden');
					$('.slideshow-pending').addClass('hidden');
					$('.slideshow-progress').attr('class','slideshow-progress percents-'+perc);
				}
			
				$('.transfer-table #' + id + ' .progressbarfill').css('width', perc +'%');
				$('.transfer-table #' + id + ' td:eq(4)').text(bytesToSize(bps,1) +'/s');
				$('.transfer-table #' + id + ' td:eq(5)').text(secondsToTime(eltime));
				$('.transfer-table #' + id + ' td:eq(6)').text(secondsToTime(retime));
				percent_megatitle();

				if (page.substr(0,2) !== 'fm')
				{
					$('.widget-block').removeClass('hidden');
					$('.widget-block').show();
					if (!ul_uploading) $('.widget-circle').attr('class','widget-circle percents-'+perc);
					$('.widget-icon.downloading').removeClass('hidden');
					$('.widget-speed-block.dlspeed').text(bytesToSize(bps,1) +'/s');
					$('.widget-block').addClass('active');
				}
				
				
			}
		}
	}

	this.dlcomplete = function (id,z, dl_queue_num)
	{
		if (slideshowid == dl_queue[dl_queue_num].id && !previews[slideshowid]) 
		{
			$('.slideshow-pending').addClass('hidden');
			$('.slideshow-error').addClass('hidden');
			$('.slideshow-progress').attr('class','slideshow-progress percents-100');
		}		
		
		if (z) id = 'zip_' + z;
		else id = 'dl_' + id;
		$('.transfer-table #' + id + ' td:eq(3)').html('<span class="transfer-status completed">' + l[554] + '</span>');
		if ($('#dlswf_'+id.replace('dl_','')).length > 0)
		{
			var flashid = id.replace('dl_','');
			$('#dlswf_'+flashid).width(170);
			$('#dlswf_'+flashid).height(22);
			$('#' + id + ' .transfer-type')
				.removeClass('download')
				.addClass('safari-downloaded')
				.text('Save File');
		}
		else
		{
			$('.transfer-table #' + id).fadeOut('slow', function(e)
			{
				$(this).remove();
			});
		}
		$.transferHeader();

		if (dlMethod == FileSystemAPI)
		{
			setTimeout(fm_chromebar,250,$.dlheight);
			setTimeout(fm_chromebar,500,$.dlheight);
			setTimeout(fm_chromebar,1000,$.dlheight);
		}
		percent_megatitle();

		var a=0;
		for(var i in dl_queue) if (dl_queue[i]) a++;
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
		if ($.transferprogress && $.transferprogress[id])
		{
			if (!$.transferprogress['dlc']) $.transferprogress['dlc'] = 0;
			$.transferprogress['dlc'] += $.transferprogress[id][1];
			delete $.transferprogress[id];
		}
	}

	this.dlbeforecomplete = function()
	{
		$.dlheight = $('body').height();
	}

	this.dlerror = function(fileid, error, dl_queue_num)
	{
		var errorstr=false;
		if (d) console.log('dlerror',fileid,error);
		if (error == EOVERQUOTA)
		{
			if (d) console.log('Quota error');
			errorstr = l[233];
		}
		else if (error == ETOOMANYCONNECTIONS) errorstr = l[18];
		else if (error == ESID) errorstr = l[19];
		else if (error == ETEMPUNAVAIL) errorstr = l[233];
		else if (error == EBLOCKED || error == ETOOMANY || error == EACCESS) errorstr=l[23];
		else if (error == ENOENT) errorstr=l[22];
		else if (error == EKEY) errorstr = l[24];
		else if (error == EAGAIN) errorstr = l[233];
		else errorstr = l[233];		
				
		if (slideshowid == dl_queue[dl_queue_num].id && !previews[slideshowid]) 
		{
			$('.slideshow-image-bl').addClass('hidden');
			$('.slideshow-pending').addClass('hidden');
			$('.slideshow-progress').addClass('hidden');
			$('.slideshow-error').removeClass('hidden');
			$('.slideshow-error-txt').text(errorstr);
		}

		var file = null;
		$.each(dl_queue, function(id, f) {
			if (f.id == fileid) {
				file = f;
				return false;
			}
		});

		if (errorstr)  {
			if (file) file.failed = new Date;
			var dom = null;
			if (file && file.zipid) {
				dom = $('.transfer-table #zip_' + file.zipid + ' td:eq(3)').html('<span class="transfer-status error">'+htmlentities(errorstr)+'</span>');
			} else {
				dom = $('.transfer-table #dl_' + fileid + ' td:eq(3)').html('<span class="transfer-status error">'+htmlentities(errorstr)+'</span>');
			}
			dom.parents('tr').data({'failed' : NOW()});
		}
	}

	this.dlstart = function(id,name,size, dl_queue_num)
	{
		$('.transfer-table #dl_' + id + ' td:eq(3)').html('<span class="transfer-status initiliazing">'+htmlentities(l[1042])+'</span>');
		if (dl_queue[dl_queue_num].zipid) id = 'zip_' + dl_queue[dl_queue_num].zipid;
		else id = 'dl_' + id;
		$('.transfer-table').prepend($('.transfer-table #' + id));
		dl_queue[dl_queue_num].st = new Date().getTime();
		M.dlprogress(id, 0, 0, 0, 0, dl_queue_num);
		$.transferHeader();
	}
	this.mobileuploads = [];

	$(document).on('remove', '.transfer-table tr', function() {
		var toClean = 0
		$.each(panelDomQueue, function(i, html) {
			if ($('.transfer-table tr:visible').length-1 > DOM_TRANSFER_LIMIT) {
				return false;
			}
			$(html).appendTo('.transfer-table')
			toClean++
		});

		panelDomQueue.splice(0, toClean);

		if (panelDomQueue.length == 0 && $('.transfer-table tr:visible').length-1 == 0) {
			$.transferClose();
			resetUploadDownload();
		}
	});

	this.addToTransferTable = function(elem) {
		if ($('.transfer-table tr').length > DOM_TRANSFER_LIMIT) {
			return panelDomQueue.push(elem);
		}
		$(elem).appendTo('.transfer-table')
	}

	this.addUpload = function(u)
	{
		for (var i in u)
		{
			var f = u[i];
			var ul_id = ul_queue.length;
			if (!f.flashid) f.flashid = false;
			f.target = M.currentdirid;
			f.id = ul_id;

			this.addToTransferTable(
				'<tr id="ul_'+ul_id+'"><td><span class="transfer-filtype-icon ' + fileicon({name:f.name}) +'"></span><span class="tranfer-filetype-txt">' + htmlentities(f.name) + '</span></td><td>' + bytesToSize(f.size) + '</td><td><span class="transfer-type upload">' + l[372] + '</span></td><td><span class="transfer-status queued">Queued</span></td><td></td><td></td><td></td><td class="grid-url-field"><a href="" class="grid-url-arrow"></a></td></tr>'
			);
			ul_queue.push(f);			
			
		}
		if (page == 'start') {
			ulQueue.pause();
			uldl_hold = false; /* this isn't a pause generated by the UI */
		}
		else openTransferpanel();
	}

	this.ulprogress = function(id, perc, bl, bt, bps)
	{
		if ($('.transfer-table #ul_' + id + ' .progress-block').length == 0)
		{
			$('.transfer-table #ul_' + id + ' .transfer-status').removeClass('queued');
			$('.transfer-table #ul_' + id + ' .transfer-status').addClass('download');
			$('.transfer-table #ul_' + id + ' td:eq(3)').html('<div class="progress-block" style=""><div class="progressbar"><div class="progressbarfill" style="width:0%;"></div></div></div>');
			$.transferHeader();
		}
		if (!bl || !ul_queue[id]['starttime']) return false;
		var eltime = (new Date().getTime()-ul_queue[id]['starttime'])/1000;
		var retime = bps > 1000 ? (bt-bl)/bps : -1;
		if (!$.transferprogress) $.transferprogress={};
		if (bl && bt && !uldl_hold)
		{
			// $.transferprogress[id] = Math.floor(bl/bt*100);
			$.transferprogress['ul_' + id] = [bl,bt];
			$('.transfer-table #ul_' + id + ' .progressbarfill').css('width',perc+'%');
			$('.transfer-table #ul_' + id + ' td:eq(4)').text(bps ? bytesToSize(bps,1) +'/s' : '');
			$('.transfer-table #ul_' + id + ' td:eq(5)').text(secondsToTime(eltime));
			$('.transfer-table #ul_' + id + ' td:eq(6)').text(secondsToTime(retime));
			percent_megatitle();
			$.transferHeader();

			if (page.substr(0,2) !== 'fm')
			{
				$('.widget-block').removeClass('hidden');
				$('.widget-block').show();
				$('.widget-circle').attr('class','widget-circle percents-'+perc);
				$('.widget-icon.uploading').removeClass('hidden');
				$('.widget-speed-block.ulspeed').text(bytesToSize(bps,1) +'/s');
				$('.widget-block').addClass('active');
			}
		}
	}

	this.ulcomplete = function(id,h,k)
	{
		this.mobile_ul_completed=true;
		for(var i in this.mobileuploads)
		{
			if (id == this.mobileuploads[i].id) this.mobileuploads[i].done=1;
			if (!this.mobileuploads[i].done) this.mobile_ul_completed=false;
		}
		if (this.mobile_ul_completed)
		{
			$('.upload-status-txt').text(l[554]);
			$('#mobileuploadtime').addClass('complete');
			$('#uploadpopbtn').text(l[726]);
			$('#mobileupload_header').text(l[554]);
		}
		$('.transfer-table #ul_' + id + ' td:eq(3)').html('<span class="transfer-status completed">' + l[554] + '</span>');
		$('.transfer-table #ul_' + id).fadeOut('slow', function(e)
		{
			$(this).remove();
		});
		$.transferHeader();
		var a=0;
		for(var i in dl_queue) if (dl_queue[i]) a++;
		if (a < 2 && !downloading)
		{
			$('.widget-block').fadeOut('slow',function(e)
			{
				$('.widget-block').addClass('hidden');
				$('.widget-block').css({opacity:1});
			});
		}
		else if (a < 2) $('.widget-icon.uploading').addClass('hidden');
		else $('.widget-circle').attr('class','widget-circle percents-0');
		if ($.transferprogress && $.transferprogress['ul_'+ id])
		{
			if (!$.transferprogress['ulc']) $.transferprogress['ulc'] = 0;
			$.transferprogress['ulc'] += $.transferprogress['ul_'+ id][1];
			delete $.transferprogress['ul_'+ id];
		}
	}

	this.ulstart = function(id)
	{
		if (d) console.log('ulstart',id);
		$('.transfer-table #ul_' + id + ' td:eq(3)').html('<span class="transfer-status initiliazing">'+htmlentities(l[1042])+'</span>');
		ul_queue[id].starttime = new Date().getTime();
		$('.transfer-table').prepend($('.transfer-table #ul_' + id));
		M.ulprogress(id, 0, 0, 0);
		$.transferHeader();
	}
}


function voucherData(arr)
{
	var vouchers = [];
	var varr = arr[0];
	var tindex = {};
	for (var i in arr[1]) tindex[arr[1][i][0]]=arr[1][i];			
	for (var i in varr)				
	{									
		var redeemed = 0;
		var cancelled = 0;
		var revoked = 0;
		var redeem_email = '';					
		if ((varr[i].rdm) && (tindex[varr[i].rdm]))
		{
			redeemed = tindex[varr[i].rdm][1];
			redeemed_email = tindex[varr[i].rdm][2];					
		}					
		if (varr[i].xl) cancelled = tindex[varr[i].xl][1];					
		if (varr[i].rvk) revoked = tindex[varr[i].rvk][1];		
		vouchers.push({
			id: varr[i].id,
			amount: varr[i].g,
			currency: varr[i].c,
			iss: varr[i].iss,
			date: tindex[varr[i].iss][1],
			code: varr[i].v,
			redeemed: redeemed,
			redeem_email: redeem_email,
			cancelled: cancelled,
			revoked: revoked						
		});
	}
	return vouchers;
}

function onUploadError(fileid, errorstr)
{
	DEBUG('OnUploadError ' + fileid + ' ' + errorstr);

	$('.transfer-table #ul_' + fileid + ' td:eq(3)')
		.html('<span class="transfer-status error">'+htmlentities(errorstr)+'</span>')
		.parents('tr').data({'failed' : NOW()});
}

function addupload(u)
{
	M.addUpload(u);
}
function onUploadStart(id)
{
	M.ulstart(id);
}
function onUploadProgress(id, p, bl, bt, speed)
{
	M.ulprogress(id, p, bl, bt, speed);
}
function onUploadSuccess(id, bl, bt)
{
	M.ulcomplete(id,bl,bt);
}

function fm_chromebar(height)
{
	if (window.navigator.userAgent.toLowerCase().indexOf('mac') >= 0 || localStorage.chromeDialog == 1) return false;
	var h = height - $('body').height();
	if ((h > 33) && (h < 41))
	{
		setTimeout(fm_chromebarcatchclick,500,$('body').height());
		chromeDialog();
	}
}

function fm_chromebarcatchclick(height)
{
	if ($('body').height() != height)
	{
		chromeDialog(1);
		return false;
	}
	setTimeout(fm_chromebarcatchclick,200,height);
}

function fm_safename(n)
{
	return n.replace(/[/\\:*?<>|]/g,'_');
}

function fm_matchname(p,name)
{
	var a= [];
	for (var i in M.d)
	{
		var n = M.d[i];
		if (n.p == p && name == n.name) a.push({id:n.h,size:n.s,name:n.name});
	}
	return a;
}

var t;

function renderfm()
{
	var t = new Date().getTime();
	initUI();
	loadingDialog.hide();
	M.sortByName();
	M.renderTree();
	M.renderPath();
	var c = $('#treesub_' + M.RootID).attr('class');
	if (c && c.indexOf('opened') < 0)
	{
		$('.fm-tree-header.cloud-drive-item').addClass('opened');
		$('#treesub_' + M.RootID).addClass('opened');
	}
	M.openFolder(M.currentdirid);
	if (d) console.log('renderfm() time:',t-new Date().getTime());
}

function rendernew()
{
	var t = new Date().getTime();
	var treebuild=[];
	var UImain=false;
	var newcontact=false;
	var newpath=false;
	for (var i in newnodes)
	{
		var n = newnodes[i];
		if (n.h.length == 11) newcontact=true;
		if (n && n.p && n.t) treebuild[n.p]=1;
		if (n.p == M.currentdirid || n.h == M.currentdirid) UImain=true;
		if ($('#path_' + n.h).length > 0) newpath=true;
	}
	var UItree=false;
	for (var h in treebuild)
	{
		var n = M.d[h];
		if (n)
		{
			M.buildtree(n);
			UItree=true;
		}
	}

	if (UImain)
	{
		M.filterByParent(M.currentdirid);
		M.sort();
		M.renderMain(true);
		M.renderPath();
		$(window).trigger('resize');
	}

	if (UItree)
	{
		treeUI();
		treeUIopen(M.currentdirid);
	}
	if (newcontact)
	{
		M.avatars();	
		M.contacts();
		treeUI();
	}
	if (newpath) M.renderPath();
	newnodes=undefined;
}



function execsc(ap)
{
	var tparentid = false;
	var trights = false;
	var tmoveid = false;
	var rootsharenodes = [];

	var loadavatars=false;

	newnodes = [];

	// actionpackets:
	for (var i in ap)
	{
		var a = ap[i];
		if (d) console.log('actionpacket',a);
		if (a.i == requesti)
		{
			if (d) console.log('OWN ACTION PACKET');
		}
		else if (a.a == 'fa')
		{
			M.nodeAttr({h:a.n,fa:a.fa});
		}
		else if (a.a == 's' && !folderlink)
		{
			var tsharekey = '';
			var prockey = false;			

			if (a.o == u_handle)
			{
				if (typeof a.r == "undefined")
				{
					// I deleted my share							
					M.delnodeShare(a.n,a.u);
				}
				else if (typeof M.d[a.n].shares != 'undefined' && M.d[a.n].shares[a.u] || a.ha == crypto_handleauth(a.n))
				{
					// I updated or created my share
					u_sharekeys[a.n] = decrypt_key(u_k_aes,base64_to_a32(a.ok));
					M.nodeShare(a.n,{h:a.n,r:a.r,u:a.u,ts:a.ts});				
				}
			}
			else
            {
                if (typeof a.n != 'undefined' && typeof a.k != 'undefined' && typeof u_sharekeys[a.n] == 'undefined')
                {
                    u_sharekeys[a.n] = crypto_process_sharekey(a.n,a.k);
                    tsharekey = a32_to_base64(u_k_aes.encrypt(u_sharekeys[a.n]));
                    prockey = true;
                }

                if (typeof a.o != 'undefined')
                {
                    if (typeof a.r == "undefined")
                    {
                        console.log('delete a share');
                        // delete a share:
                        var n = M.d[a.n];
                        if (n && n.p.length != 11) M.nodeAttr({h:a.n,r:0,su:''});
                        else M.delNode(a.n);
                        if (!folderlink && a.u !== 'EXP' && fminitialized) addnotification({t: 'dshare',n: a.n,u:a.o});
                        delete u_sharekeys[a.n];
                    }
                    else
                    {
                        console.log('I receive a share, prepare for receiving tree a');
                        // I receive a share, prepare for receiving tree a
                        tparentid 	= a.o;
                        trights 	= a.r;
                        if (M.d[a.n])
                        {
                            // update rights:
                            M.nodeAttr({h:a.n,r:a.r,su:a.o});
                        }
                        else
                        {
                            console.log('look up other root-share-nodes from this user');
                            // look up other root-share-nodes from this user:
                            if (typeof M.c[a.o] != 'undefined') for(var i in M.c[a.o]) if (M.d[i] && M.d[i].t == 1) rootsharenodes[i]=1;

                            if (!folderlink && fminitialized) addnotification(
                            {
                                t: 'share',
                                n: a.n,
                                u: a.o
                            });
                        }
                    }
                }
            }

			if (prockey)
			{
				var nodes = fm_getnodes(a.n,1);
				nodes.push(a.n);
				for (var i in nodes)
				{
					var n = M.d[nodes[i]];

					if (n)
					{
						var f = {a:n.a,h:n.h,k:n.k};
						crypto_processkey(u_handle,u_k_aes,f);
						M.nodeAttr({h:nodes[i],name:f.name,key:f.key,sk:tsharekey});
						newnodes.push(M.d[n.h]);
					}
				}
			}

			crypto_share_rsa2aes();
		}
		else if (a.a == 'k' && !folderlink)
		{
			if (a.sr) crypto_procsr(a.sr);
			else if (a.cr) crypto_proccr(a.cr);
			else api_req({a:'k',cr:crypto_makecr(a.n,[a.h],true)});
		}
		else if (a.a == 't')
		{
			if (tparentid)
			{
				for (var b in a.t.f)
				{
					if (rootsharenodes[a.t.f[b].h] && M.d[a.t.f[b].h])
					{
						a.t.f[b].r  = M.d[a.t.f[b].h].r;
						a.t.f[b].su = M.d[a.t.f[b].h].su;
						M.delNode(a.t.f[b].h);
					}
				}

				if (!M.d[a.t.f[0].p]) a.t.f[0].p = tparentid;

				a.t.f[0].su = tparentid;
				a.t.f[0].r  = trights;

				if (tsharekey)
				{
					a.t.f[0].sk  = tsharekey;
					tsharekey=false;
				}
				rootsharenodes=[];
			}

			// notification logic:
			if (fminitialized && !folderlink && a.ou && a.ou != u_handle && a.t && a.t.f && a.t.f[0] && a.t.f[0].p.length < 11 && !tmoveid && !tparentid)
			{
				var targetid = a.t.f[0].p;
				var pnodes = [];
				for (var i in a.t.f) if (a.t.f[i].p == targetid) pnodes.push({ h: a.t.f[i].h, t: a.t.f[i].t});
				addnotification({t: 'put',n: targetid,u: a.ou,f: pnodes});
			}

			tparentid = false;
			trights = false;
			process_f(a.t.f);
		}
		else if (a.a == 'c')
		{
			process_u(a.u);
		}
		else if (a.a == 'd')
		{
			M.delNode(a.n);
		}
		else if (a.a == 'ua' && fminitialized)
		{
			for (var i in a.ua)
			{
				if (a.ua[i] == '+a')
				{
					avatars[a.u]=undefined;
					loadavatars=true;
				}
			}
		}
		else if (a.a == 'u')
		{
			var n = M.d[a.n];
			if (n)
			{
				var f = {h:a.n,k:a.k,a:a.at},newpath=0;
				crypto_processkey(u_handle,u_k_aes,f);
				if (f.key)
				{
					u_nodekeys[a.n] = f.key;
					if (f.name !== n.name)
					{
						$('.grid-table.fm #' + n.h + ' .tranfer-filetype-txt').text(f.name);
						$('.file-block#' + n.h + ' .file-block-title').text(f.name);
						$('#treea_' + n.h + ' span').text(f.name);
						if ($('#path_' + n.h).length > 0) newpath=1;						
						if (n.h == M.RootID) $('.fm-tree-header.cloud-drive-item span').text(f.name);
					}
					if (f.fav !== n.fav)
					{
						if (f.fav)
						{
							$('.grid-table.fm #' + n.h + ' .grid-status-icon').addClass('star');
							$('.file-block#' + n.h + ' .file-status-icon').addClass('star');
						}
						else
						{
							$('.grid-table.fm #' + n.h + ' .grid-status-icon').removeClass('star');
							$('.file-block#' + n.h + ' .file-status-icon').removeClass('star');
						}
					}
					M.nodeAttr({h:a.n,fav:f.fav,name:f.name,key:f.key,a:a.at});
					if (newpath) M.renderPath();
				}
				if (a.cr) crypto_proccr(a.cr);
			}
		}
		else if (a.a == 'la')
		{
			notifymarkcount(true);
			donotify();
		}
		else
		{
			if (d) console.log('not processing this action packet',a);
		}
	}
	if (newnodes.length > 0 && fminitialized) rendernew();
	if (loadavatars) M.avatars();
	fm_thumbnails();	
	if ($.dialog == 'properties') propertiesDialog();	
	getsc();
}

var M = new MegaData();

function fm_updatekey(h,k)
{
	var n = M.d[h];
	if (n)
	{
		var f = {h:h,k:k,a:M.d[h].a};
		crypto_processkey(u_handle,u_k_aes,f);
		u_nodekeys[h] = f.key;
		M.nodeAttr({h:h,name:f.name,key:f.key,k:k});
	}
}

function fm_commitkeyupdate()
{
		// refresh render?
}

function loadfm()
{
	M.reset();
	fminitialized=false;
	loadingDialog.show();
	api_req({a:'f',c:1,r:1},{
		callback : loadfm_callback
	},n_h ? 1 : 0);
}

function RightsbyID(id)
{
	if (folderlink) return false;
	if (id.length > 8) return false;
	var p = M.getPath(id);
	if (p[p.length-1] == 'contacts') return M.d[p[p.length-3]].r;
	else return 2;
}

function isCircular(fromid,toid)
{
	var n = M.d[fromid];
	if (n && n.t)
	{
		if (toid == fromid) return false;
		var p1 = M.getPath(fromid);
		var p2 = M.getPath(toid);
		p1.reverse();
		p2.reverse();
		var c=1;
		for (var i in p1) if (p1[i] !== p2[i]) c=0;
		if (c) return true;
		else return false;
	}
	else return false;
}

function RootbyId(id)
{
	if (id) id = id.replace('chat/','');
	var p = M.getPath(id);
	return p[p.length-1];
}

function ddtype(ids,toid)
{
	var r=false;
	for (var i in ids)
	{
		var fromid = ids[i];

		if (folderlink) return false;

		if (fromid == toid) return false;

		// never allow move to own inbox, or to own contacts
		if (toid == M.InboxID || toid == 'contacts') return false;

		// to a contact, always allow a copy
		if (RootbyId(toid) == 'contacts' && M.d[toid].p == 'contacts') r = 'copy';

		// to a shared folder, only with write rights
		if (RootbyId(toid) == 'contacts' && RightsbyID(toid) > 0)
		{
			if (isCircular(fromid,toid)) return false;
			else r = 'copy';
		}
		// cannot move or copy to the existing parent
		if (toid == M.d[fromid].p) return false;

		// from own cloud to own cloud / trashbin, always move
		if ((toid == M.RootID || toid == M.RubbishID || M.d[toid].t) && (RootbyId(fromid) == M.RootID) && (RootbyId(toid) == M.RootID || toid == M.RubbishID))
		{
			if (isCircular(fromid,toid)) return false;
			else r = 'move';
		}
		// from trashbin or inbox to own cloud, always move
		if ((RootbyId(fromid) == M.RubbishID || RootbyId(fromid) == M.InboxID) && RootbyId(toid) == M.RootID) r = 'move';

		// from inbox to trashbin, always move
		if (RootbyId(fromid) == M.InboxID && RootbyId(toid) == M.RubbishID) r = 'move';

		// from trashbin or inbox to a shared folder with write permission, always copy
		if ((RootbyId(fromid) == M.RubbishID || RootbyId(fromid) == M.InboxID) && RootbyId(toid) == 'contacts' && RightsbyID(toid) > 0) r = 'copy';

		// copy from a share to cloud
		if (RootbyId(fromid) == 'contacts' && (toid == M.RootID  || RootbyId(toid) == M.RootID)) r = 'copy';

		// move from a share to trashbin only with full control rights (do a copy + del for proper handling)
		if (RootbyId(fromid) == 'contacts' && toid == M.RubbishID && RightsbyID(fromid) > 1) r = 'copydel';
	}
	return r;
}

function fm_getnodes(h,ignore)
{
	var nodes = [];
	function procnode(h)
	{
		if (M.c[h])
		{
			for (var n in M.c[h])
			{
				if (M.d[n].name || ignore) nodes.push(n);
				if (M.d[n].t == 1) procnode(n);
			}
		}
	}
	procnode(h);
	return nodes;
}

function fm_getsharenodes(h)
{
	var sn=[];
	var n=M.d[h];
	while (n && n.p && n)
	{
		if (typeof n.shares !== 'undefined' || u_sharekeys[n.h]) sn.push(n.h);
		n = M.d[n.p];
	}
	return sn;
}

function createfolder(toid,name,ulparams)
{
	var mkat = enc_attr({ n : name },[]);
	var attr = ab_to_base64(mkat[0]);
	var key = a32_to_base64(encrypt_key(u_k_aes,mkat[1]));
	var req = { a: 'p',t: toid,n: [{ h:'xxxxxxxx', t:1, a:attr, k:key }],i: requesti};
	var sn = fm_getsharenodes(toid);
	if (sn.length)
	{
		req.cr = crypto_makecr([mkat[1]],sn,false);
		req.cr[1][0] = 'xxxxxxxx';
	}
	if (!ulparams) loadingDialog.show();
	api_req(req,
	{
	  ulparams: ulparams,
	  callback : function(res,ctx)
	  {
		if (typeof res != 'number')
		{
			$('.fm-new-folder').removeClass('active');
			$('.create-folder-input-bl input').val('');
			newnodes=[];
			M.addNode(res.f[0]);
			rendernew();
			loadingDialog.hide();
			if (ctx.ulparams) ulparams.callback(ctx.ulparams,res.f[0].h);
		}
	  }
	});
}

function getuid(email)
{
	for(var j in M.u) if (M.u[j].m == email)  return j;
	return false;
}

function doshare(h,t)
{
	nodeids = fm_getnodes(h);
	nodeids.push(h);

	api_setshare(h,t,nodeids,
	{
		t : t,
		h : h,

		done : function(res,ctx)
		{
			var i;

			if (res.r && res.r[0] == '0')
			{
				for (i in res.u) M.addUser(res.u[i]);

				for (i in res.r)
				{
					if (res.r[i] == 0)
					{
						var rights = ctx.t[i].r;
						var user = ctx.t[i].u;
						if (user.indexOf('@') >= 0) user = getuid(ctx.t[i].u);
						M.nodeShare(ctx.h,{h:$.selected[0],r:rights,u:user,ts:Math.floor(new Date().getTime()/1000)});
					}
				}
				$('.fm-dialog.share-dialog').removeClass('hidden');
				loadingDialog.hide();
				M.renderShare($.selected[0]);
				shareDialog();
				renderfm();
			}
			else
			{
				$('.fm-dialog.share-dialog').removeClass('hidden');
				loadingDialog.hide();
			}
		}
	});
}

function processmove(jsonmove)
{
	for (i in jsonmove)
	{
		var sharingnodes = fm_getsharenodes(jsonmove[i].t);

		if (sharingnodes.length)
		{
			var movingnodes = fm_getnodes(jsonmove[i].n);
			movingnodes.push(jsonmove[i].n);
			jsonmove[i].cr = crypto_makecr(movingnodes,sharingnodes,true);
		}

		api_req(jsonmove[i]);
	}
}

function process_f(f)
{
	for (var i in f) M.addNode(f[i]);
}

function process_u(u)
{
	for (var i in u)
	{
		if (u[i].c == 1)
		{
			u[i].name = u[i].m;
			u[i].h = u[i].u;
			u[i].t=1;
			u[i].p = 'contacts';
			M.addNode(u[i]);
		}
		else if (M.d[u[i].u]) M.delNode(u[i].u);
		M.addUser(u[i]);
	}
}

function process_ok(ok)
{
	for(i in ok)
	{
		if (mDB && !pfkey) mDBadd('ok',ok[i]);
		if (ok[i].ha ==  crypto_handleauth(ok[i].h)) u_sharekeys[ok[i].h] = decrypt_key(u_k_aes,base64_to_a32(ok[i].k));
	}
}


function folderreqerr(c,e)
{
    loadingDialog.hide();
	msgDialog('warninga',l[1043],l[1044] + '<ul><li>' + l[1045] + '</li><li>' + l[247] + '</li><li>' + l[1046] + '</li>',false,function()
	{
		folderlink=pfid;
		document.location.hash='';
	});
}

function loadfm_callback(res)
{
	if (pfkey && res.f && res.f[0])
	{
		M.RootID = res.f[0].h;
		u_sharekeys[res.f[0].h] = base64_to_a32(pfkey);
		folderlink=pfid;
	}	
	if (res.u) process_u(res.u);
	if (res.ok) process_ok(res.ok);
	process_f(res.f);	
	if (res.s) for (var i in res.s) M.nodeShare(res.s[i].h,res.s[i]);
	maxaction = res.sn;
	if (mDB) localStorage[u_handle + '_maxaction'] = maxaction;
	renderfm();
	if (!pfkey) pollnotifications();

	if (res.cr) crypto_procmcr(res.cr);
	if (res.sr) crypto_procsr(res.sr);

	getsc();
}

function storefmconfig(n,c)
{
	fmconfig[n] = c;
	localStorage.fmconfig = JSON.stringify(fmconfig);
}

function fmtreenode(id,e)
{
	if (RootbyId(id) == 'contacts') return false;
	var treenodes = {};
	if (typeof fmconfig.treenodes !== 'undefined') treenodes = fmconfig.treenodes;
	if (e) treenodes[id] = 1;
	else
	{
		$('#treesub_'+id+' .expanded').each(function(i,e)
		{
			var id2 = $(e).attr('id');
			if (id2)
			{
				id2 = id2.replace('treea_','');
				$('#treesub_'+id2).removeClass('opened');
				$('#treea_'+id2).removeClass('expanded');
				delete treenodes[id2];
			}
		});
		delete treenodes[id];
	}
	storefmconfig('treenodes',treenodes);
}

function fmsortmode(id,n,d)
{
	var sortmodes = {};
	if (typeof fmconfig.sortmodes !== 'undefined') sortmodes = fmconfig.sortmodes;
	if (n == 'name' && d > 0) delete sortmodes[id];
	else sortmodes[id] = {n:n,d:d};
	storefmconfig('sortmodes',sortmodes);
}

function fmviewmode(id,e)
{
	var viewmodes = {};
	if (typeof fmconfig.viewmodes !== 'undefined') viewmodes = fmconfig.viewmodes;
	if (e) viewmodes[id]=1;
	else viewmodes[id]=0;
	storefmconfig('viewmodes',viewmodes);
}

function fm_requestfolderid(h,name,ulparams)
{
	if (!h) h = M.RootID;
	if (M.c[h])
	{
		for (var n in M.c[h])
		{
			if (M.d[n] && M.d[n].t && M.d[n].name == name)
			{
				ulparams.callback(ulparams,M.d[n].h);
				return true;
			}
		}
	}
	createfolder(h,name,ulparams);
}

function clone(obj)
{
    if (null == obj || "object" != typeof obj) return obj;
    if (obj instanceof Date)
	{
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }
    if (obj instanceof Array)
	{
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }
    if (obj instanceof Object)
	{
        var copy = {};
        for (var attr in obj)
		{
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }
}

function balance2pro(callback)
{
	api_req({a:'uq',pro:1},
	{
		cb: callback,
		callback : function (res,ctx)
		{
			if (typeof res == 'object' && res['balance'] && res['balance'][0])
			{
				var pjson = JSON.parse(pro_json);

				for (var i in pjson[0])
				{
					if (pjson[0][i][5] == res['balance'][0][0])
					{
						api_req({a:'uts',it:0,si:pjson[0][i][0],p:pjson[0][i][5],c:pjson[0][i][6]},
						{
							cb: ctx.cb,
							callback : function (res,ctx)
							{
								if (typeof res == 'number' && res < 0 && ctx.cb) ctx.cb(false);
								else
								{
									api_req({ a : 'utc', s: [res], m: 0},
									{
										cb: ctx.cb,
										callback : function (res,ctx)
										{
											if (ctx.cb) ctx.cb(true);
											u_checklogin({checkloginresult: function(u_ctx,r)
											{
												if (M.account) M.account.lastupdate=0;
												u_type = r;
												topmenuUI();
												if (u_attr.p) msgDialog('info',l[1047],l[1048]);
											}});
										}
									});
								}
							}
						});
					}
				}
			}
		}
	});
}
