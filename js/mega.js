var newnodes;
var fminitialized=false;

if (typeof seqno == 'undefined') var seqno = Math.ceil(Math.random()*1000000000);
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
var zipid=0;

function jsrand()
{
	return Math.floor(Math.random()*Math.random()*Math.random()*Math.random()*10000000);
}

function MegaData ()
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
	this.currentdirid = false;	
	this.viewmode = 0;
	
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
		this.currentdirid = false;	
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
		  if (node.p == id) return true;
		});
	};
	
	
	this.filterBySearch = function(str)
	{
		str = str.replace('search/','');
		this.filterBy(function(node) 
		{
		  if (node.name && str && node.name.toLowerCase().indexOf(str.toLowerCase()) > -1) return true;
		});
	};
	
	this.avatars = function()
	{
		var ops = [];
		for (var u in M.c['contacts']) if (!avatars[u]) ops.push({"a":"uga","u":u,"ua":"+a"});		
		if (!avatars[u_handle]) ops.push({"a":"uga","u":u_handle,"ua":"+a"});		
		api_req(ops,
		{
			ops:ops,
			callback: function(e,ctx)
			{
				for (var i in e)
				{
					if (typeof e[i] !== 'number')
					{
						var blob = new Blob([str_to_ab(base64urldecode(e[i]))],{ type: 'image/jpeg' });			
						avatars[ctx.ops[i].u] = 
						{
							data: blob,
							url: myURL.createObjectURL(blob)
						}						
						var el = $('.contact-block-view-avatar.' + ctx.ops[i].u + ',.avatar.' + ctx.ops[i].u + ',.contacts-avatar.' + ctx.ops[i].u);
						if (el.length > 0) el.find('img').attr('src',avatars[ctx.ops[i].u].url);
						
						if (u_handle == ctx.ops[i].u) $('.fm-avatar img,.fm-account-avatar img').attr('src',avatars[ctx.ops[i].u].url);			
					}				
				}				
			}		
		});
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
						html = '<a class="file-block' + c + '" id="' + htmlentities(this.v[i].h) + '"><span class="file-status-icon'+star+'"></span><img alt=""  src="' + fileicon(this.v[i],'m') + '" /><span class="file-block-title">' + htmlentities(this.v[i].name) + '</span></a>';
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
						html = '<tr id="' + htmlentities(this.v[i].h) + '" class="' + c + '"><td width="30"><span class="grid-status-icon'+star+'"></span></td><td><span class="transfer-filtype-icon"><img alt="" src="' + fileicon(this.v[i],'s') + '" /></span><span class="tranfer-filetype-txt">' + htmlentities(this.v[i].name) + '</span></td><td width="100">' + s + '</td><td width="130">' + t + '</td><td width="120">' + time2date(this.v[i].ts) + '</td><td width="50" class="grid-url-field"><a href="" class="grid-url-arrow"></a></td></tr>';
						t = '.grid-table.fm';
					}						
				}
				if (!u || $(t + ' '+el).length == 0) 
				{
					if (d) console.log('option1');
					$(t).append(html);
				}
				else if (u && $(t+' #'+this.v[i].h).length == 0 && this.v[i-1] && $(t+' #'+this.v[i-1].h).length > 0)
				{
					if (d) console.log('option2');
					$(t+' #'+this.v[i-1].h).after(html);
				}
				else if (u && $(t+' #'+this.v[i].h).length == 0 && this.v[i+1] &&  $(t+' #'+this.v[i+1].h).length > 0)
				{
					if (d) console.log('option3');
					$(t+' #'+this.v[i+1].h).before(html);
				}
				else if ($(t+' #'+this.v[i].h).length == 0)
				{
					if (d) console.log('option4');
					$($(t+' '+el)[0]).before(html);
				}				
			}
		}		
		$('.grid-url-arrow').unbind('click');
		$('.grid-url-arrow').bind('click',function()
		{
			$.selected = [$(this).closest('tr').attr('id')];			
			if (u_type === 0) ephemeralDialog(l[1005]);			
			else M.getlinks([$.selected]);
		});
		
		if (this.viewmode == 1)
		{
			$('.file-block-scrolling').append('<div class="clear"></div>');
			iconUI();
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
		$('.cloudsub').attr('id','treesub_' + M.RootID);		
		if (!folderlink) $('.rubbishsub').attr('id','treesub_' + M.RubbishID);	
		$('#treesub_' + M.RootID).html('');
		this.buildtree(this.d[this.RootID]);		
		$('#treesub_contacts').html('');
		this.buildtree({h:'contacts'});
		$('#treesub_' + M.RubbishID).html('');
		this.buildtree({h:M.RubbishID});		
		treeUI();
	};
	
	this.openFolder = function(id,force)
	{
		if (d) console.log('openFolder()',M.currentdirid,id);
		if (id !== 'notifications' && $('.fm-main.notifications').attr('class').indexOf('hidden') == -1) notificationsUI(1);
		this.search=false;
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
		else if (id && id.substr(0,7) == 'account') accountUI();
		else if (id && id.substr(0,13) == 'notifications') notificationsUI();
		else if (id && id.substr(0,7) == 'search/') this.search=true;
		else if (!M.d[id]) id = this.RootID;		
		this.currentdirid = id;
		
		if (id == this.RootID) $('.fm-connector-first').removeClass('active');
		
		if (id.substr(0,7) !== 'account' && id.substr(0,13) !== 'notifications')
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
					if (images.indexOf('|'+ext+'|') > -1) viewmode=1;
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
			if (d) console.log('time for rendering:',tt-new Date().getTime());
			
			setTimeout(function()
			{
				M.renderPath();
			},1);
		}
		if (!n_h) window.location.hash = '#fm/' + M.currentdirid;		
	};
	
	this.buildtree = function(n)
	{
		if (this.c[n.h])
		{
			var folders = [];
			for(var i in this.c[n.h]) if (this.d[i].t == 1 && this.d[i].name) folders.push(this.d[i]);	
			if (n.h == M.RubbishID) $('.fm-tree-header.recycle-item').addClass('recycle-notification');
			if (folders.length > 0)
			{
				if (n.h == M.RootID) $('.fm-left-panel .fm-tree-header.cloud-drive-item').addClass('contains-subfolders');
				else if (n.h == M.RubbishID) $('.fm-left-panel .fm-tree-header.recycle-item').addClass('contains-subfolders');
				else if (n.h == 'contacts') $('.fm-left-panel .fm-tree-header.contacts-item').addClass('contains-subfolders');
				else $('#treesub_'+n.h).siblings('a').addClass('contains-folders');
			}
			folders.sort(function(a,b)
			{
				if (a.name) return a.name.localeCompare(b.name);
			});
			for (var i in folders)
			{
				var treenode = '<span>' + htmlentities(folders[i].name) + '</span>';
				var contactc = '';
				var statusc = '';				
				if (n.h == 'contacts')
				{
					contactc = 'contact';
					statusc = 'no-status';					
					var avatar = staticpath + 'images/mega/default-avatar.png';
					if (avatars[folders[i].h]) avatar = avatars[folders[i].h].url;					
					treenode = '<span><span class="avatar ' + folders[i].h + '"><span><img src="'+ avatar + '" alt=""/></span></span><span class="messages-icon"><span class="active">2</span></span><span class="contact-name">' + htmlentities(folders[i].name) +'</span></span>';	
				}
				var s = '';
				if (typeof folders[i].shares != 'undefined') s = 'shared-folder';
				var ulc = '';
				var expandedc = '';
				var buildnode=false;								
				if (fmconfig && fmconfig.treenodes && fmconfig.treenodes[folders[i].h] && typeof M.c[folders[i].h] !== 'undefined')
				{
					ulc = 'class="opened"';
					expandedc = 'expanded';			
					buildnode = true;
				}				
				var containsc='';
				var cns = M.c[folders[i].h];			
				if (cns) for (var cn in cns) if (M.d[cn] && M.d[cn].t) containsc = 'contains-folders';				
				var html = '<li id="treeli_' + folders[i].h + '"><span class="fm-connector ' + contactc + '"></span><span class="fm-horizontal-connector ' + contactc + '"></span><a class="fm-tree-folder ' + contactc + ' ' + s + ' ' + statusc + ' ' + expandedc + ' ' + containsc +'" id="treea_' + folders[i].h + '">' + treenode + '</a><ul id="treesub_' + folders[i].h + '" ' + ulc + '></ul></li>';			
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
		if (c && c.indexOf('hidden') == -1) length += $('.fm-new-folder').width();		
		var c = $('.fm-folder-upload').attr('class');
		if (c && c.indexOf('hidden') == -1) length += $('.fm-folder-upload').width();		
		var c = $('.fm-file-upload').attr('class');
		if (c && c.indexOf('hidden') == -1) length += $('.fm-file-upload').width();		
		var c = $('.fm-clearbin-button').attr('class');
		if (c && c.indexOf('hidden') == -1) length += $('.fm-clearbin-button').width();		
		var c = $('.fm-add-user').attr('class');
		if (c && c.indexOf('hidden') == -1) length += $('.fm-add-user').width();		
		length += $('.fm-breadcrumbs-block').width();		
		length += $('.fm-back-button').width();		
		return length;
	};

	this.renderPath = function()
	{
		var hasnext='';		
		var html = '<div class="clear"></div>';		
		var a = this.getPath(this.currentdirid);
		for (var i in a)
		{		
			if (a[i] == this.RootID)
			{
				typeclass = 'cloud-drive';
				name = l[164];				
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
		
		if (this.currentdirid && this.currentdirid.substr(0,7) == 'search/')
		{
			$('.fm-breadcrumbs-block').html('<a class="fm-breadcrumbs cloud-drive contains-directories ui-droppable" id="'+htmlentities(a[i])+'"><span class="right-arrow-bg ui-draggable"><span>' +  htmlentities(this.currentdirid.replace('search/',''))	+ '</span></span></a>');
		}
		else  $('.fm-breadcrumbs-block').html(html);
		
		$('.fm-new-folder span').text(l[68]);
		$('.fm-file-upload span').text(l[99]);
		$('.fm-folder-upload span').text(l[98]);
		
		$('.fm-right-header').removeClass('long-path');		
		if (M.pathLength()+250 > $('.fm-right-header').width())
		{
			$('.fm-right-header').addClass('long-path');
			$('.fm-new-folder span').text('');
			$('.fm-file-upload span').text('');
			$('.fm-folder-upload span').text('');
		}
		
		var el = $('.fm-breadcrumbs-block .fm-breadcrumbs span span');
		var i =0;
		
		while (M.pathLength()+250 > $('.fm-right-header').width() && i < el.length)
		{
			$(el[i]).text('');
			i++;
		}
		
		$('.fm-breadcrumbs-block a').unbind('click');
		$('.fm-breadcrumbs-block a').bind('click',function(event) 
		{
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
		if (!M.d[n.p])
		{			
			if (n.sk) n.p = n.u;
			else if (n.su) n.p = n.su;
		}
		
		if (mDB && !ignoreDB && !pfkey) mDBadd('f',clone(n));		
		if (n.p)
		{
			if (typeof this.c[n.p] == 'undefined') this.c[n.p] = [];			
			this.c[n.p][n.h]=1;
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
			if (M.c[h]) 
			{
				for(var h2 in M.c[h]) ds(h2);
				delete M.c[h];
			}
			if (mDB && !pfkey) mDBdel('f',h);
			if (M.d[h])
			{
				M.delIndex(M.d[h].p,h);
				delete M.d[h];
			}
			if (M.v[h]) delete M.v[h];	
			removeUInode(h);
		}
		ds(h);
	};
	
	
	this.addContact = function(email)
	{
		api_req([{a: 'ur',u: email,l: '1',i: requesti}],
		{ 
		  callback : function (json,params)
		  {			
			if (json[0].u)
			{
				newnodes=[];
				process_u([{ c: 1, m: json[0].m,h:json[0].u, u: json[0].u, ts: (new Date().getTime()/1000) }],false);				
				rendernew();
			}
			else if ((json[0] == 0) || (json[0] == -303))
			{
				var talready='';			
				if (json[0] == -303) talready = 'already ';				
				msgDialog('info',l[150],l[151].replace('[X]',talready));						
			}
			else if (json[0] == -2) msgDialog('info',l[135],l[152]);			
			$('.add-user-popup input').val('');
			loadingDialog.hide(); 
		  }		  
		});
	};
	
	this.clearRubbish = function(sel)
	{
		var selids = [];		
		if (sel && $.selected) for (var i in $.selected) selids[$.selected[i]]=1;
		var j = [];
		for (var h in M.c[M.RubbishID])
		{
			if (!sel || selids[h])
			{
				this.delNode(h);			
				j.push({a:'d',n:h,i:requesti});				
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
		api_req(j);		
	}

	this.addUser = function(u,ignoreDB)
	{		
		this.u[u.u]=u;
		if (mDB && !ignoreDB && !pfkey) mDBadd('u',clone(u));
	};
	
	this.copyNodes = function(cn,t)
	{
		loadingDialog.show();
		if (t.length == 11 && !u_pubkeys[t])
		{		
			api_cachepubkeys(
			{
				cachepubkeyscomplete: function(ctx)
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
		var ops = [{a:'p',t:t,n:a,i:requesti}];
		var s = fm_getsharenodes(t);
		if (s.length > 0)
		{
			var mn = [];
			for (i in a) mn.push(mn[i]);
			ops[0].cr =  crypto_makecr(mn,s,true);
		}		
		api_req(ops,
		{ 
			t:t,
			callback : function (json,ctx)
			{
				newnodes = [];
				if (json[0].u) process_u(json[0].u,true);			
				if (json[0].f) process_f(json[0].f);
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
				this.delIndex(M.d[h].p,h);
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
			api_req([{a:'uq',strg:1,xfer:1,pro:1},{a:'uavl'},{a:'utt'},{a: 'utp'},{a: 'usl'},{a:'ug'}],
			{
				cb: cb,
				callback: function(json,ctx)
				{
					loadingDialog.hide();
					
					if (json[5] && json[5].p)
					{
						u_attr.p = json[5].p;						
						if (u_attr.p) topmenuUI();
					}
					
					if (json)
					{
						M.account = 
						{
							type: json[0].utype,
							stype: json[0].stype,
							stime: json[0].scycle,
							scycle: json[0].snext,	
							expiry: json[0].suntil,	
							space: Math.round(json[0].mstrg),					
							space_used: Math.round(json[0].cstrg),	
							bw: Math.round(json[0].mxfer),
							servbw_used: Math.round(json[0].csxfer),
							downbw_used: Math.round(json[0].caxfer),
							servbw_limit: json[0].srvratio,
							balance: json[0].balance,
							reseller: json[0].reseller,
							prices: json[0].prices,							
							vouchers: json[1],
							transactions: json[2],
							purchases: json[3],
							sessions: json[4],							
							lastupdate: new Date().getTime()
						}
						if (!u_attr.p)
						{
							M.account.servbw_used=0;
							
							if (json[0].tah)
							{
								var t=0;
								for (var i in json[0].tah)
								{
									t+=json[0].tah[i];
								}
								M.account.downbw_used = t;
								M.account.bw = json[0].tal;
							}
						}
						
						if (!M.account.bw) M.account.bw=1024*1024*1024*10;
						if (!M.account.servbw_used) M.account.servbw_used=0;
						if (!M.account.downbw_used) M.account.downbw_used=0;
							
						if (json[0].balance.length == 0) M.account.balance = [['0.00','EUR']];
						
						if (ctx.cb) ctx.cb(M.account);					
					}				
				}
			});
		}		
	}
		
	this.delIndex = function(p,h)
	{
		if (d) console.log('delIndex',p,h);
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
				api_req([{a:'a',n:h,attr:attr,key:key,i:requesti}]);				
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
		var ops = [];
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
					ops.push({a:'a',n:n.h,attr:attr,key:key,i:requesti});					
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
		if (ops.length > 0) api_req(ops);
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
		}
	}
		
	this.delnodeShare = function(h,u)
	{
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
		var ops = [];
		for (var i in this.links) ops.push({a: 'l',n: this.links[i]});
		api_req(ops,
		{ 
		  callback : function (json,params)
		  {
			if (typeof json == 'object')
			{
				for(var i in json) 
				{
					var r=[];
					if (!((typeof json[i] == 'number') && (json[i] < 0)))
					{
						var n = M.d[M.links[i]];						
						M.nodeAttr({h:n.h,ph:json[i]});
					}
				}				
				linksDialog();
				loadingDialog.hide();
			}
			else loadingDialog.hide();  		
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
					api_setshare1(n.h,[{u: 'EXP',r: 0}],h,
					{
						userid : 'EXP',
						done: function(c)
						{
							c.req.i = requesti;
							api_req([c.req],
							{
							  callback : function (j,params)
							  {
								api_setshare2(j,M.fln.h);
								if (j[0].r && j[0].r[0] == 0) M.nodeShare(M.fln.h,{h:M.fln.h,r:0,u:'EXP',ts:Math.ceil(new Date().getTime()/1000)});
								M.getFolderlinks();
							  }
							});
						}
					});
				}
			}
			else this.getFolderlinks();
		}
		else this.getlinksDone();
	}

	this.addDownload = function(n,z)
	{
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
					var subids = fm_getnodes(n[i]);			
					for(var j in subids)
					{
						var p = this.getPath(subids[j]);
						var path = '';
						for(var k in p)
						{
							if (p[k],M.d[p[k]].t) path = M.d[p[k]].name.replace(/[/\\:*?<>|]/g,'_') + '/' + path;							
							if (p[k] == M.d[subids[j]].p) break;
						}										
						if (!M.d[subids[j]].t)
						{
							nodes.push(subids[j]);
							paths[subids[j]]=path;
						}
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
			else zipname = 'Archive.zip';
			var zipsize = 0;
		}
		else z = false;		
		for (var i in nodes)
		{		
			n = M.d[nodes[i]];
			
			if (paths[nodes[i]]) path = paths[nodes[i]];
			else path ='';
			
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
					zipname: zipname
				});
				zipsize += n.s;
				
				
				var flashhtml='';
				if (dl_method == 1)
				{
					flashhtml = '<object width="1" height="1" id="dlswf_'+ htmlentities(n.h) + '" type="application/x-shockwave-flash"><param name=FlashVars value="buttonclick=1" /><param name="movie" value="' + document.location.origin + '/downloader.swf"/><param value="always" name="allowscriptaccess"><param name="wmode" value="transparent"><param value="all" name="allowNetworking"></object>';
				}
				
				if (!z) $('.transfer-table').append('<tr id="dl_'+htmlentities(n.h)+'"><td><span class="transfer-filtype-icon"><img alt="" src="' + fileicon(n,'s') +'"></span><span class="tranfer-filetype-txt">' + htmlentities(n.name) + '</span></td><td>' + bytesToSize(n.s) + '</td><td><span class="transfer-type download">' + l[373] + '</span>' + flashhtml + '</td><td><span class="transfer-status queued">Queued</span></td><td></td><td></td><td></td></tr>');
			}
		}
		if (z) $('.transfer-table').append('<tr id="zip_'+zipid+'"><td><span class="transfer-filtype-icon"><img alt="" src="' + fileicon({name:'archive.zip'},'s') + '"></span><span class="tranfer-filetype-txt">' + htmlentities(zipname) + '</span></td><td>' + bytesToSize(zipsize) + '</td><td><span class="transfer-type download">' + l[373] + '</span></td><td><span class="transfer-status queued">Queued</span></td><td></td><td></td><td></td></tr>');
		$('.tranfer-view-icon').addClass('active');
		$('.fmholder').addClass('transfer-panel-opened');
		$.transferHeader();
		initGridScrolling();
		initFileblocksScrolling();
		initTreeScroll();
		startdownload();
		
		delete $.dlhash;
	}
	
	this.dlprogress = function (id, bl, bt,kbps)
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
		if ($('.transfer-table #' + id + ' .progress-block').length == 0)
		{
			$('.transfer-table #' + id + ' td:eq(3)').html('<div class="progress-block" style=""><div class="progressbar-percents">0%</div><div class="progressbar"><div class="progressbarfill" style="width:0%;"></div></div><div class="clear"></div></div>');
			$.transferHeader();
		}		
		if (!bl) return false;	
		if (!$.transferprogress) $.transferprogress=[];		
		if (kbps == 0) return false;		
		var eltime = (new Date().getTime()-st)/1000;
		var bps = kbps*1000;
		var retime = (bt-bl)/bps;
		var perc = Math.floor(bl/bt*100);
		if (bl && bt)
		{
			$.transferprogress[id] = Math.floor(bl/bt*100);	
			if (!uldl_hold)
			{
				$('.transfer-table #' + id + ' .progressbarfill').css('width',Math.round(bl/bt*100)+'%');				
				$('.transfer-table #' + id + ' .progressbar-percents').text(Math.round(bl/bt*100)+'%');		
				$('.transfer-table #' + id + ' td:eq(4)').text(bytesToSize(bps,1) +'/s');				
				$('.transfer-table #' + id + ' td:eq(5)').text(secondsToTime(eltime));
				$('.transfer-table #' + id + ' td:eq(6)').text(secondsToTime(retime));				
				if ((!ul_uploading) && (perc == 100)) megatitle();
				else if (!ul_uploading) megatitle(' ' + perc + '%');
				$.transferHeader();

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
	
	this.dlcomplete = function (id,z)
	{
		if (z) id = 'zip_' + z;
		else id = 'dl_' + id;		
		$('.transfer-table #' + id + ' td:eq(3)').html('<span class="transfer-status completed">' + l[554] + '</span>');		
		if ($('#dlswf_'+id.replace('dl_','')).length > 0)
		{
			var flashid = id.replace('dl_','');
			$('#dlswf_'+flashid).width(170);
			$('#dlswf_'+flashid).height(22);
			$('#' + id + ' .transfer-type').removeClass('download');
			$('#' + id + ' .transfer-type').addClass('safari-downloaded');
			$('#' + id + ' .transfer-type').text('Save File');
		}
		else
		{		
			$('.transfer-table #' + id).fadeOut('slow', function(e) 
			{
				$(this).remove();
			});
		}
		$.transferHeader();
		
		if (dl_method === 0)
		{
			setTimeout(fm_chromebar,250,$.dlheight);
			setTimeout(fm_chromebar,500,$.dlheight);
			setTimeout(fm_chromebar,1000,$.dlheight);
		}
		megatitle();

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
	}
	
	this.dlbeforecomplete = function()
	{
		$.dlheight = $('body').height();
	}
	
	this.dlerror = function(fileid,error)
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
		else if (error == EBLOCKED) errorstr=l[21];		
		else if (error == ENOENT) errorstr=l[22];	
		else if (error == EACCESS) errorstr = l[23];	
		else if (error == EKEY) errorstr = l[24];	
		else if (error == EAGAIN) errorstr = l[233];	
		else errorstr = l[233];
		
		if (errorstr) $('.transfer-table #dl_' + fileid + ' td:eq(3)').html('<span class="transfer-status error">'+htmlentities(errorstr)+'</span>');
	}
	
	this.dlstart = function(id,name,size)
	{
		$('.transfer-table #dl_' + id + ' td:eq(3)').html('<span class="transfer-status initiliazing">'+htmlentities(l[1042])+'</span>');
		if (dl_queue[dl_queue_num].zipid) id = 'zip_' + dl_queue[dl_queue_num].zipid;
		else id = 'dl_' + id;		
		$('.transfer-table').prepend($('.transfer-table #' + id));		
		dl_queue[dl_queue_num].st = new Date().getTime();		
		M.dlprogress(id);
		$.transferHeader();		
	}	
	this.mobileuploads = [];	
	this.addUpload = function(u)
	{
		for (var i in u)
		{
			var f = u[i];
			var ul_id = ul_queue.length;
			if (!f.flashid) f.flashid = false;
			f.target = M.currentdirid;
			f.id = ul_id;
			ul_queue.push(f);
			$('.transfer-table').append('<tr id="ul_'+ul_id+'"><td><span class="transfer-filtype-icon"><img alt="" src="' + fileicon({name:f.name},'s') +'"></span><span class="tranfer-filetype-txt">' + htmlentities(f.name) + '</span></td><td>' + bytesToSize(f.size) + '</td><td><span class="transfer-type upload">' + l[372] + '</span></td><td><span class="transfer-status queued">Queued</span></td><td></td><td></td><td></td></tr>');
		}
		if (page !== 'start') openTransferpanel();
	}
	
	this.ulprogress = function(id,bl,bt)
	{
		if ($('.transfer-table #ul_' + id + ' .progress-block').length == 0)
		{			
			$('.transfer-table #ul_' + id + ' .transfer-status').removeClass('queued');
			$('.transfer-table #ul_' + id + ' .transfer-status').addClass('download');
			$('.transfer-table #ul_' + id + ' td:eq(3)').html('<div class="progress-block" style=""><div class="progressbar-percents">0%</div><div class="progressbar"><div class="progressbarfill" style="width:0%;"></div></div><div class="clear"></div></div>');
			$.transferHeader();
		}
		if (!bl) return false;
		var eltime = (new Date().getTime()-ul_queue[id]['starttime'])/1000;	
		var bps = Math.round(bl / eltime);
		var retime = (bt-bl)/bps;	
		if (!$.transferprogress) $.transferprogress=[];
		var perc = Math.floor(bl/bt*100);
		if (bl && bt && !uldl_hold)
		{
			$.transferprogress[id] = Math.floor(bl/bt*100);				
			$('.transfer-table #ul_' + id + ' .progressbarfill').css('width',Math.round(bl/bt*100)+'%');				
			$('.transfer-table #ul_' + id + ' .progressbar-percents').text(Math.round(bl/bt*100)+'%');				
			$('.transfer-table #ul_' + id + ' td:eq(4)').text(bytesToSize(bps,1) +'/s');				
			$('.transfer-table #ul_' + id + ' td:eq(5)').text(secondsToTime(eltime));
			$('.transfer-table #ul_' + id + ' td:eq(6)').text(secondsToTime(retime));				
			if ((!ul_uploading) && (perc == 100)) megatitle();
			else if (!ul_uploading) megatitle(' ' + perc + '%');
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
	}
	
	this.ulstart = function(id)
	{
		if (d) console.log('ulstart',id);		
		$('.transfer-table #dl_' + id + ' td:eq(3)').html('<span class="transfer-status initiliazing">'+htmlentities(l[1042])+'</span>');		
		ul_queue[id].starttime = new Date().getTime();
		$('.transfer-table').prepend($('.transfer-table #ul_' + id));
		M.ulprogress(id);
		$.transferHeader();
	}
}


function onUploadError(fileid,error)
{
	if (d) console.log('OnUploadError ' + fileid + ' ' + error);
}

function addupload(u)
{
	M.addUpload(u);
}
function onUploadStart(id)
{
	M.ulstart(id);
}
function onUploadProgress(id, bl, bt)
{
	M.ulprogress(id,bl,bt);
}
function onUploadSuccess(id, bl, bt)
{
	M.ulcomplete(id,bl,bt);
}


function fm_zipcomplete(id)
{
	M.dlcomplete(false,id);
}

function fm_chromebar(height)
{
	if (window.navigator.userAgent.toLowerCase().indexOf('mac') > -1 || localStorage.chromeDialog == 1) return false;	
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
	if (c && c.indexOf('opened') == -1)
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
	}
	
	if (UItree)
	{
		treeUI();
		treeUIopen(M.currentdirid);
	}
	if (newcontact)
	{
		M.avatars();
		M.buildtree({h:'contacts'});
		treeUIopen('contacts');
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
			if (typeof u_sharekeys[a.n] == 'undefined' && typeof a.k != 'undefined')
			{				
				u_sharekeys[a.n] = crypto_process_sharekey(a.n,a.k);			
				tsharekey = a32_to_base64(u_k_aes.encrypt(u_sharekeys[a.n]));
				prockey=true;
			}		
			
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
					M.nodeShare(a.n,{h:a.n,r:a.r,u:a.u,ts:a.ts});
				}			
			}
			else if (typeof a.o != 'undefined')
			{
				if (typeof a.r == "undefined")
				{					
					// delete a share:
					var n = M.d[a.n];					
					if (n && n.p.length != 11) M.nodeAttr({h:a.n,r:0,su:''});					
					else M.delNode(a.n);					
					if (!folderlink && a.u !== 'EXP' && fminitialized) addnotification({t: 'dshare',n: a.n,u:a.o});
					delete u_sharekeys[a.n];
				}
				else
				{
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
			else if (prockey)
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
			else api_req([{a:'k',cr:crypto_makecr(a.n,[a.h],true)}]);
		}
		else if (a.a == 't')
		{
			if (tparentid)
			{	
				for (var b in a.t.f)
				{
					if (rootsharenodes[a.t.f[b].h])
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
		else if (a.a == 'u' && !folderlink)
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
	fminitialized=false;
	loadingDialog.show();
	api_req([{a:'f', c:1, r:1}],
	{	
		callback : loadfm_callback 
	});
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
	api_req([req],
	{ 
	  ulparams: ulparams,
	  callback : function (json,params)
	  {
		if (typeof json[0] !== 'number')
		{
			$('.fm-new-folder').removeClass('active');
			$('.create-folder-input-bl input').val('');
			newnodes=[];
			M.addNode(json[0].f[0]);
			rendernew();			
			loadingDialog.hide();
			if (params.ulparams) ulparams.callback(params.ulparams,json[0].f[0].h);
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
	api_setshare1(h,t,nodeids,
	{
		t : t,
		h : h,
		done: function(c)
		{		
			c.req.i = requesti;
			api_req([c.req],
			{
			  t: c.t,
			  h: c.h,
			  callback : function (json,c)
			  {				
				api_setshare2(json,c.h);
				if (json[0].r && json[0].r[0] == '0')
				{														
					if (json[0])
					{						
						for (var i in json[0].u) M.addUser(json[0].u[i]);
						
						for (var i in json[0].r)
						{
							if (json[0].r[i] == 0)
							{
								var rights = c.t[i].r;
								var user = c.t[i].u;
								if (user.indexOf('@') > -1) user = getuid(c.t[i].u);								
								M.nodeShare(c.h,{h:$.selected[0],r:rights,u:user,ts:Math.ceil(new Date().getTime()/1000)});				
							}
						}
						$('.fm-dialog.share-dialog').removeClass('hidden');
						loadingDialog.hide();
						M.renderShare($.selected[0]);
						shareDialog();
						renderfm();
					}					
				}
				else
				{
					$('.fm-dialog.share-dialog').removeClass('hidden');
					loadingDialog.hide();				
				}
			  }
			});
		}
	});
}

function processmove(jsonmove)
{	
	for (i in jsonmove)
	{	
		var sharingnodes = fm_getsharenodes(jsonmove[i].t);
		if (sharingnodes.length > 0)	
		{		
			var movingnodes = fm_getnodes(jsonmove[i].n);
			movingnodes.push(jsonmove[i].n);
			jsonmove[i].cr = crypto_makecr(movingnodes,sharingnodes,true);
		}
	}
	api_req(jsonmove);
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

function loadfm_callback(json)
{
	if (pfid && ((typeof json == 'number' && json < 0) || (json[0] && typeof json[0] == 'number' && json[0] < 0))) 
	{		
		loadingDialog.hide();
		msgDialog('warninga',l[1043],l[1044] + '<ul><li>' + l[1045] + '</li><li>' + l[247] + '</li><li>' + l[1046] + '</li>',false,function()
		{
			folderlink=pfid;			
			document.location.hash='';
		});
		return false;
	}
	else if (pfkey && json[0] && json[0].f && json[0].f[0])
	{
		M.RootID = json[0].f[0].h;			
		u_sharekeys[json[0].f[0].h] = base64_to_a32(pfkey);
		folderlink=pfid;
	}	
	
	if (json[0].ok) process_ok(json[0].ok);
	process_f(json[0].f);
	if (json[0].u) process_u(json[0].u);	
	if (json[0].s) for(var i in json[0].s) M.nodeShare(json[0].s[i].h,json[0].s[i]);		
	maxaction = json[0].sn;
	localStorage[u_handle + '_maxaction'] = maxaction;
	renderfm();
	if (!pfkey) pollnotifications();
	
	if (json[0].cr) crypto_procmcr(json[0].cr);
	if (json[0].sr) crypto_procsr(json[0].sr);
	
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
	api_req([{a: 'uq',pro: 1}],
	{ 
		cb: callback,
		callback : function (json,params)
		{
			if (json[0] && json[0]['balance'] && json[0]['balance'][0])
			{
				var pjson = JSON.parse(pro_json);
				for (var i in pjson[0])
				{
					if (pjson[0][i][5] == json[0]['balance'][0][0])
					{
						api_req([{a:'uts',it:0,si:pjson[0][i][0],p:pjson[0][i][5], c: pjson[0][i][6]}],
						{ 
							cb: params.cb,
							callback : function (json,params) 
							{
								if (typeof json[0] == 'number' && json[0] < 0 && params.cb) params.cb(false);
								else
								{
									api_req([{ a : 'utc', s: [json[0]], m: 0}],
									{ 
										cb: params.cb,
										callback : function (json,params) 
										{
											if (params.cb) params.cb(true);
											u_checklogin({checkloginresult: function(u_ctx,r) 
											{												
												if (M.account) M.account.lastupdate=0;
												u_type = r;
												topmenuUI();
												if (u_attr.p)
												{
													msgDialog('info',l[1047],l[1048]);
												}
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

