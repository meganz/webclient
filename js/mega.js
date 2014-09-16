var newnodes;
var fminitialized=false;
var panelDomQueue = {};

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
		//$('body').addClass('overlayed');
		$('.loading-spinner').show();
	};
	loadingDialog.hide = function()
	{
		$('.dark-overlay').hide();
		//$('body').removeClass('overlayed');
		$('.loading-spinner').hide();
	};
}

var fmconfig ={};
if (localStorage.fmconfig) fmconfig = JSON.parse(localStorage.fmconfig);
var maxaction;
var zipid=1;

function fmUpdateCount() {
	var i = 0;
	$('.transfer-table span.row-number').each(function() {
		$(this).text(++i);
	});
}

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

	this.sortByOwner = function(d)
	{
		this.sortfn = function(a,b,d)
		{
			var usera = M.d[a.p], userb = M.d[b.p];
			if (typeof usera.name == 'string' && typeof userb.name == 'string') return usera.name.localeCompare(userb.name)*d;
			else return -1;
		}
		this.sortd=d;
		this.sort();
	};

	this.sortByAccess = function(d)
	{
		this.sortfn = function(a,b,d)
		{
			if (typeof a.r !== 'undefined' && typeof b.r !== 'undefined' && a.r < b.r) return -1*d;
			else return 1*d;
		}
		this.sortd=d;
		this.sort();
	};

	this.getSortStatus = function(u)
	{
		var status = megaChat.karere.getPresence(megaChat.getJidFromNodeId(u));
		if (status == 'chat') return 1;
		else if (status == 'dnd') return 2;
		else if (status == 'away') return 3;
		else return 4;
	};

	this.sortByStatus = function(d)
	{
		this.sortfn = function(a,b,d)
		{
			var statusa = M.getSortStatus(a.u),statusb = M.getSortStatus(b.u);
			if (statusa < statusb) return -1*d;
			else return 1*d;
		}
		this.sortd=d;
		this.sort();
	};

	this.sortByInteraction = function(d)
	{
		this.i_cache = {};
		this.sortfn = function(a,b,d)
		{
			if (!M.i_cache[a.u])
			{
				var cs = M.contactstatus(a.u);
				if (cs.ts == 0) cs.ts = -1;
				M.i_cache[a.u] = cs.ts;
			}
			if (!M.i_cache[b.u])
			{
				var cs = M.contactstatus(b.u);
				if (cs.ts == 0) cs.ts = -1;
				M.i_cache[b.u] = cs.ts;
			}
			if (M.i_cache[b.u] < M.i_cache[a.u]) return -1*d;
			else return 1*d;
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
		else if (n == 'owner') M.sortByOwner(d);
		else if (n == 'access') M.sortByAccess(d);
		else if (n == 'interaction') M.sortByInteraction(d);
		else if (n == 'status') M.sortByStatus(d);
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

    /**
     * The same as filterBy, but instead of pushing the stuff in M.v, will return a new array.
     *
     * @param f function, with 1 arguments (node) that returns true when a specific node should be returned in the list
     * of filtered results
     */
    this.getFilterBy = function (f)
    {
        var v= [];
        for (var i in this.d) {
            if (f(this.d[i])) v.push(this.d[i]);
        }

        return v;
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

						var el = $('.nw-contact-avatar.' + ctx.u);
						if (el.length > 0) $(el).html('<img src="' + avatars[ctx.u].url + '">');

						var el = $('.nw-contact-block-avatar.' + ctx.u);
						if (el.length > 0) $(el).html('<img src="' + avatars[ctx.u].url + '">');

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

	this.onlineStatusClass = function(os)
	{
		if (os == 'dnd') return ['Busy','busy'];
		else if (os == 'away') return ['Away','away'];
		else if (os == 'chat' || os == 'available') return ['Online','online'];
		else return ['Offline','offline'];
	};

	this.onlineStatusEvent = function(u,status)
	{
		if (u)
		{
			var e = $('.ustatus.' + u.u);
			if (e.length > 0)
			{
				$(e).removeClass('offline online busy away');
				$(e).addClass(this.onlineStatusClass(status)[1]);
			}
			var e = $('.fm-chat-user-status.' + u.u);
			if (e.length > 0) $(e).html(this.onlineStatusClass(status)[0]);
			if ($.sortTreePanel.contacts.by == 'status') {
				M.contacts(); // we need to resort
			}

            if(window.location.hash == "#fm/" + u.u) {
                // re-render the contact view page if the presence had changed
                contactUI();
            }
		}
	};

	this.renderMain = function(u)
	{
		function flush_cached_nodes(n)
		{
			var e = cache.splice(0, n || cache.length);

			if (e.length)
			{
				var n = M.viewmode == 0 ? $('.grid-table.fm') : $('.file-block-scrolling').data('jsp').getContentPane();

				for (var i in e)
				{
					if (M.v[e[i][0]] && M.v[e[i][0]].h === e[i][2])
					{
						M.v[e[i][0]].seen = true;
					}
					else
					{
						if (d > 1) console.log('desync cached node...', e[i][2]);

						for (var k in M.v)
						{
							if (M.v[k].h === e[i][2])
							{
								M.v[k].seen = true;
								break;
							}
						}
					}
					n.append(e[i][1]);
				}
				if (M.dynlistRt) clearTimeout(M.dynlistRt);
				M.dynlistRt = setTimeout(function()
				{
					delete M.dynlistRt;
					M.rmSetupUI();

					// var max = e[0][0];
					// for (var i = 0 ; i < max ; ++i)
					// {
						// var n = M.v[i];
						// if (n.seen && !$(t+' #'+n.h).visible())
						// {
							// n.seen = false;
							// $('.file-block#' + n.h + ' img').attr('src','about:blank');
						// }
					// }
				}, 750);
				$(window).trigger('resize');
			}
			else
			{
				$(lSel).unbind('jsp-scroll-y.dynlist');
			}
		}
		var cache = [], n_cache, files = 0, jsp, t, lSel;

		lSel = '.files-grid-view.fm .grid-scrolling-table, .fm-blocks-view.fm .file-block-scrolling';
		$(lSel).unbind('jsp-scroll-y.dynlist');
		$(window).unbind("resize.dynlist");
		sharedfolderUI()
		$(window).trigger('resize');

		hideEmptyMsg();

		jsp = $('.file-block-scrolling').data('jsp');
		if (jsp) jsp.destroy();

		jsp = $('.contacts-blocks-scrolling').data('jsp');
		if (jsp) jsp.destroy();

		jsp = $('.contacts-details-block .file-block-scrolling').data('jsp');
		if (jsp) jsp.destroy();
		jsp = undefined;

		if (!u)
		{
			$('.grid-table tr').remove();
			$('.file-block-scrolling a').remove();
			$('.contacts-blocks-scrolling a').remove();
		}

		if (this.v.length == 0)
		{
			if (M.currentdirid == M.RubbishID) $('.fm-empty-trashbin').removeClass('hidden');
			else if (M.currentdirid == 'contacts') $('.fm-empty-contacts').removeClass('hidden');
			else if (M.currentdirid.substr(0,7) == 'search/') $('.fm-empty-search').removeClass('hidden');
			else if (M.currentdirid == M.RootID) $('.fm-empty-cloud').removeClass('hidden');
			else if (M.currentdirid == M.InboxID) $('.fm-empty-messages').removeClass('hidden');
			else if (M.currentdirid == 'shares') $('.fm-empty-incoming').removeClass('hidden');
			else if (RootbyId(M.currentdirid) == M.RootID) $('.fm-empty-folder').removeClass('hidden');
			else if (RootbyId(M.currentdirid) == 'shares')
			{
				$(lSel).before($('.fm-empty-folder .fm-empty-pad:first').clone().removeClass('hidden').addClass('fm-empty-sharef'));
				$(window).trigger('resize');
			}
			else if (RootbyId(M.currentdirid) == 'contacts') $('.fm-empty-incoming.contact-details-view').removeClass('hidden');
		}
		else if (this.currentdirid.length != 11 && !~['contacts','shares'].indexOf(this.currentdirid))
		{
			if (this.viewmode == 1)
			{
				var r = Math.floor($('.fm-blocks-view.fm').width() / 140);
				n_cache = r*Math.ceil($('.fm-blocks-view.fm').height()/164)+r;
			}
			else
			{
				n_cache = Math.ceil($('.files-grid-view.fm').height() / 24);
			}
			if (!n_cache)
			{
				this.cRenderMainN = this.cRenderMainN || 1;
				if (++this.cRenderMainN < 4) return Soon(function()
				{
					M.renderMain(u);
				});
			}
		}

		delete this.cRenderMainN;

		for (var i in this.v)
		{
			if (this.v[i].name)
			{
				var s='';
				var ftype = '';
				var c = '';
				if (this.v[i].t)
				{
					ftype = l[1049];
					c = ' folder';
				}
				else
				{
					ftype = filetype(this.v[i].name);
					s = htmlentities(bytesToSize(this.v[i].s));
				}
				var html,el,cc,star='';
				if (this.v[i].fav) star = ' star';

				if (this.currentdirid == 'contacts')
				{
					var u_h = this.v[i].h;
					var cs = this.contactstatus(u_h);
					var contains = fm_contains(cs.files,cs.folders);
					var time = time2last(cs.ts);
					var interactionclass = 'cloud-drive';
					if (cs.files == 0 && cs.folders == 0)
					{
						contains = l[1050];
						time = l[1051];
						var interactionclass = 'never';
					}
					var user = M.d[u_h];
					var avatar = user.name.substr(0,2), av_color = user.name.charCodeAt(0)%6 + user.name.charCodeAt(1)%6;
					if (avatars[u_h]) avatar = '<img src="' + avatars[u_h].url + '">';

					var onlinestatus = this.onlineStatusClass(megaChat.karere.getPresence(megaChat.getJidFromNodeId(u_h)));

					if (this.viewmode == 1)
					{
						el = 'div';
						t = '.contacts-blocks-scrolling';
						html = '<a class="file-block ustatus '+ htmlentities(u_h) + ' '+ onlinestatus[1] + '" id="' + htmlentities(this.v[i].h) + '"><span class="nw-contact-status"></span><span class="nw-contact-block-avatar two-letters ' + htmlentities(u_h) + ' color' + av_color + '">' + avatar + '</span><span class="shared-folder-info-block"><span class="shared-folder-name">' + htmlentities(user.name) + '</span><span class="shared-folder-info">' + htmlentities(user.m) + '</span></span> </a>';
					}
					else
					{
						el = 'tr';
						t = '.grid-table.contacts';
						html = '<tr id="' + htmlentities(this.v[i].h) + '"><td><div class="nw-contact-avatar ' + htmlentities(u_h) + ' color' + av_color + '">' + avatar + '</div><div class="fm-chat-user-info todo-star"><div class="fm-chat-user">' + htmlentities(user.name) + '</div><div class="contact-email">' + htmlentities(user.m) + '</div></div></td><td width="240"><div class="ustatus '+ htmlentities(u_h) + ' '+ onlinestatus[1] + '"><div class="nw-contact-status"></div><div class="fm-chat-user-status ' + htmlentities(u_h) + '">' + onlinestatus[0] + '</div><div class="clear"></div></div></td><td width="270"><div class="contacts-interation ' + interactionclass + '">' + time + '</div></td></tr>';
					}
				}
				else if (this.currentdirid == 'shares')
				{
					var cs = this.contactstatus(this.v[i].h);
					var contains = fm_contains(cs.files,cs.folders);
					if (cs.files == 0 && cs.folders == 0) contains = l[1050];
					var u_h = this.v[i].p;
					var user = M.d[u_h];
					var avatar = user.name.substr(0,2), av_color = user.name.charCodeAt(0)%6 + user.name.charCodeAt(1)%6;
					if (avatars[u_h]) avatar = '<img src="' + avatars[u_h].url + '">';
					var rights = 'Read only', rightsclass = ' read-only';
					if (M.v[i].r == 1)
					{
						rights = 'Read and write';
						rightsclass = ' read-and-write';
					}
					else if (M.v[i].r == 2)
					{
						rights = 'Full access';
						rightsclass = ' full-access';
					}
					var onlinestatus = this.onlineStatusClass(megaChat.karere.getPresence(megaChat.getJidFromNodeId(u_h)));
					if (this.viewmode == 1)
					{
						t = '.shared-blocks-scrolling';
						el = 'a';
						html = '<a class="file-block folder" id="' + htmlentities(this.v[i].h) + '"><span class="file-status-icon '+star+'"></span><span class="shared-folder-access ' + rightsclass + '"></span><span class="file-icon-area"><span class="block-view-file-type folder"></span></span><span class="nw-contact-avatar ' + htmlentities(u_h) + ' color' + av_color + '">' + avatar +'</span><span class="shared-folder-info-block"><span class="shared-folder-name">' + htmlentities(this.v[i].name) + '</span><span class="shared-folder-info">by ' + htmlentities(user.name) + '</span></span></a>';
					}
					else
					{
						t = '.shared-grid-view .grid-table.shared-with-me';
						el='tr';
						html = '<tr id="' + htmlentities(this.v[i].h) + '"><td width="30"><span class="grid-status-icon '+star+'"></span></td><td><div class="shared-folder-icon"></div><div class="shared-folder-info-block"><div class="shared-folder-name">' + htmlentities(this.v[i].name) + '</div><div class="shared-folder-info">' + contains + '</div></div> </td><td width="240"><div class="nw-contact-avatar ' + htmlentities(u_h) + ' color' + av_color + '">' + avatar + '</div><div class="fm-chat-user-info todo-star ustatus '+ htmlentities(u_h) + ' ' + onlinestatus[1] + '"><div class="todo-fm-chat-user-star"></div><div class="fm-chat-user">' + htmlentities(user.name) + '</div><div class="nw-contact-status"></div><div class="fm-chat-user-status ' + htmlentities(u_h) + '">' + onlinestatus[0] + '</div><div class="clear"></div></div></td><td width="270"><div class="shared-folder-access' + rightsclass + '">' + rights + '</div></td></tr>';
					}
				}
				else if (this.currentdirid.length == 11)
				{
					var cs = this.contactstatus(this.v[i].h);
					var contains = fm_contains(cs.files,cs.folders);
					if (cs.files == 0 && cs.folders == 0) contains = l[1050];
					var rights = 'Read only', rightsclass = ' read-only';
					if (M.v[i].r == 1)
					{
						rights = 'Read and write';
						rightsclass = ' read-and-write';
					}
					else if (M.v[i].r == 2)
					{
						rights = 'Full access';
						rightsclass = ' full-access';
					}

					if (this.viewmode == 1)
					{
						t = '.fm-blocks-view.contact-details-view .file-block-scrolling';
						el = 'a';
						html = '<a id="' + htmlentities(this.v[i].h) + '" class="file-block folder"><span class="file-status-icon"></span><span class="file-settings-icon"><span></span></span><span class="shared-folder-access ' + rightsclass + '"></span><span class="file-icon-area"><span class="block-view-file-type folder-shared"><img alt=""></span></span><span class="file-block-title">' + htmlentities(this.v[i].name) + '</span></a>';
					}
					else
					{
						t = '.contacts-details-block .grid-table.shared-with-me';
						el='tr';
						html = '<tr id="' + htmlentities(this.v[i].h) + '"><td width="30"><span class="grid-status-icon"></span></td><td><div class="shared-folder-icon"></div><div class="shared-folder-info-block"><div class="shared-folder-name">' + htmlentities(this.v[i].name) + '</div><div class="shared-folder-info">' + contains + '</div></div> </td><td width="270"><div class="shared-folder-access ' + rightsclass + '">' + rights + '</div></td></tr>';
					}
				}
				else
				{
					if (this.viewmode == 1)
					{
						t = '.fm-blocks-view.fm .file-block-scrolling';
						el = 'a';
						html = '<a class="file-block' + c + '" id="' + htmlentities(this.v[i].h) + '"><span class="file-status-icon'+star+'"></span><span class="file-settings-icon"><span></span></span><span class="file-icon-area"><span class="block-view-file-type '+ fileicon(this.v[i]) + '"><img alt="" /></span></span><span class="file-block-title">' + htmlentities(this.v[i].name) + '</span></a>';
					}
					else
					{
						t = '.grid-table.fm';
						el = 'tr';
						html = '<tr id="' + htmlentities(this.v[i].h) + '" class="' + c + '"><td width="30"><span class="grid-status-icon'+star+'"></span></td><td><span class="transfer-filtype-icon ' + fileicon(this.v[i]) + '"> </span><span class="tranfer-filetype-txt">' + htmlentities(this.v[i].name) + '</span></td><td width="100">' + s + '</td><td width="130">' + ftype + '</td><td width="120">' + time2date(this.v[i].ts) + '</td><td width="42" class="grid-url-field"><a class="grid-url-arrow"><span></span></a></td></tr>';
					}
					if (!(this.v[i].seen = n_cache > files++))
					{
						// cache[this.v[i].h] = [i,this.v[i].t];
						cc = [i,html,this.v[i].h,this.v[i].t];
					}
				}

				if (!u || $(t + ' '+el).length == 0)
				{
					// 1. if the current view does not have any nodes, just append it
					if (cc)
					{
						cache.push(cc);
					}
					else
					{
						$(t).append(html);
					}
				}
				else
				{
					var j;
					if ($(t+' #'+this.v[i].h).length)
					{
						files--;
						this.v[i].seen = true;
						continue;
					}

					if (cc)
					{
						// console.log(i, this.v[i].name,cache.map(n=>n[2]));

					/*	if (u && this.v[i-1] && cache[this.v[i-1].h])
						{
							j = cache[this.v[i-1].h][0];
							for (var x = 0, m = cache.length ; x < m ; ++x)
							{
								if (cache[x][0] === j)
								{
									cache.splice(x,0,cc);
									break;
								}
							}
							// the cached node have to be found
							ASSERT(x!=m,'Huh..2b');
						}
						else if (u && this.v[i+1] && cache[this.v[i+1].h]) // XXX?
						{
							j = cache[this.v[i+1].h][0];
							for (var x = 0, m = cache.length ; x < m ; ++x)
							{
								if (cache[x][0] === j)
								{
									ASSERT(x>0,'3b');
									cache.splice(x-1,0,cc);
									break;
								}
							}
							// the cached node have to be found
							ASSERT(x!=m,'Huh..3b');
						}
						else*/
						if (this.v[i].t)
						{
							for (var x = 0, m = cache.length ; x < m && cache[x][3] ; ++x);
							cache.splice(x,0,cc);
						}
						else
						{
							cache.push(cc);
						}
						continue;
					}

					if (u && this.v[i-1] && $(t+' #'+this.v[i-1].h).length)
					{
						// 2. if there is a node before the new node in the current view, add it after that node:
						$(t+' #'+this.v[i-1].h).after(html);
					}
					else if (u && this.v[i+1] && $(t+' #'+this.v[i+1].h).length)
					{
						// 3. if there is a node after the new node in the current view, add it before that node:
						$(t+' #'+this.v[i+1].h).before(html);
					}
					else if (this.v[i].t)
					{
						// 4. new folder: insert new node before the first folder in the current view
						$($(t+' '+el)[0]).before(html);
					}
					else // !this.v[i].t)
					{
						// 5. new file: insert new node before the first file in the current view
						var a = $(t+' '+el).not('.folder');
						if (a.length > 0) $(a[0]).before(html);
						else
						{
							// 6. if this view does not have any files, insert after the last folder
							a = $(t+' '+el);
							$(a[a.length-1]).after(html);
						}
					}
				}
			}
		}

		// sharedfolderUI();
		contactUI();

		$(window).unbind('dynlist.flush');
		$(window).bind('dynlist.flush', function()
		{
			if (cache.length) flush_cached_nodes();
		});

		if (d) console.log('cache %d/%d (%d)', cache.length, files, n_cache);
		if (cache.length)
		{
			$(lSel).bind('jsp-scroll-y.dynlist', function(ev, pos, top, bot)
			{
				if (bot) flush_cached_nodes(n_cache);
			});

			$(window).bind("resize.dynlist", SoonFc(function()
			{
				if (cache.length)
				{
					if (!$(lSel).find('.jspDrag:visible').length)
					{
						var n;

						if (M.viewmode == 1)
						{
							var r = Math.floor($('.fm-blocks-view.fm').width() / 140);
							n = r*Math.ceil($('.fm-blocks-view').height()/164) - $('.fm-blocks-view.fm a').length;
						}
						else
						{
							n = 2 + Math.ceil($('.files-grid-view.fm').height() / 24 - $('.files-grid-view.fm tr').length);
						}

						if (n > 0) flush_cached_nodes(n);
					}
				}
				else
				{
					$(window).unbind("resize.dynlist");
				}
			}));
		}

		if (this.viewmode == 1)
		{
			fa_duplicates = {};
		}

		this.rmSetupUI();

		if (!u && n_cache) $.rmInitJSP = lSel;
	};

	this.rmSetupUI = function()
	{
		if (this.viewmode == 1)
		{
			if (this.v.length > 0)
			{
				var o = $('.fm-blocks-view.fm .file-block-scrolling');
				o.find('div.clear').remove();
				o.append('<div class="clear"></div>');
			}
			iconUI();
			fm_thumbnails();
		}
		else Soon(gridUI);
		Soon(fmtopUI);

		function prepareShareMenuHandler(e) {
			e.preventDefault(); e.stopPropagation();
			e.currentTarget = $('ul#treesub_shares .selected')
			e.calculatePosition = true;
			$.selected = [e.currentTarget.attr('id').substr(6)] 
		}

		$('.shared-details-info-block .grid-url-arrow').unbind('click');
		$('.shared-details-info-block .grid-url-arrow').bind('click', function(e) {
			prepareShareMenuHandler(e);
			contextmenuUI(e,1);
		});

		$('.shared-details-info-block .fm-share-download').unbind('click');
		$('.shared-details-info-block .fm-share-download').bind('click', function(e) {
			prepareShareMenuHandler(e);
			var $this = $(this);
			e.clientX = $this.offset().left;
			e.clientY = $this.offset().top + $this.height()

			contextmenuUI(e,3);
		});

		$('.shared-details-info-block .fm-share-copy').unbind('click');
		$('.shared-details-info-block .fm-share-copy').bind('click', function(e) {
			$.copyDialog = 'copy';// this is used like identifier when key with key code 27 is pressed
			$.mcselected = M.RootID;
			$('.copy-dialog .dialog-copy-button').addClass('active');
			$('.copy-dialog').removeClass('hidden');
			handleDialogContent('cloud-drive', 'ul', true, 'copy', 'Paste');
			$('.fm-dialog-overlay').removeClass('hidden');
			$('body').addClass('overlayed');
		});

		$('.shared-details-info-block .fm-leave-share').unbind('click');
		$('.shared-details-info-block .fm-leave-share').bind('click', function(e) {
			$('.nw-fm-left-icon.cloud-drive').trigger('click');
		});

		$('.grid-scrolling-table .grid-url-arrow,.file-block .file-settings-icon').unbind('click');
		$('.grid-scrolling-table .grid-url-arrow').bind('click',function(e) {
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

		$('.file-block .file-settings-icon').bind('click',function(e) {
			var target = $(this).parents('.file-block');
			if (target.attr('class').indexOf('ui-selected') == -1) {
				target.parent().find('a').removeClass('ui-selected');
			}
			target.addClass('ui-selected');
			e.preventDefault(); e.stopPropagation(); // do not treat it as a regular click on the file
			e.currentTarget = target;
			cacheselect();
			searchPath();
			contextmenuUI(e,1);
		});
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
		this.buildtree({h:M.RubbishID});
		this.contacts();
		treeUI();
        if(MegaChatEnabled) {
            megaChat.renderContactTree();
        }
	};

	this.openFolder = function(id,force,chat)
	{
		$('.fm-right-account-block').addClass('hidden');
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
			this.chat=true;
			id = 'chat';

            if(megaChat.renderListing() === true) {
                window.location = megaChat.getCurrentRoom().getRoomUrl();
                return;
            }

            sharedfolderUI();
            treeUI();
		}
		else if (id && id.substr(0,7) == 'account') accountUI();
		else if (id && id.substr(0,13) == 'notifications') notificationsUI();
		else if (id && id.substr(0,7) == 'search/') this.search=true;
		else if (id && id.substr(0,5) == 'chat/')
		{
			this.chat=true;
            treeUI();

            chatui(id); // XX: using the old code...for now
		}
		else if (!M.d[id]) id = this.RootID;

		if (!this.chat) {
            if(megaChat.getCurrentRoom()) {
                megaChat.getCurrentRoom().hide();
            }
        }

		this.currentdirid = id;

		$('.nw-fm-tree-item').removeClass('opened');

		if (this.chat)
		{
			// do nothing here
		}
		else if (id && id.substr(0,7) !== 'account' && id.substr(0,13) !== 'notifications')
		{
			$('.fm-right-files-block').removeClass('hidden');
			if (d) console.time('time for rendering');
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
			if (fminitialized && (id.substr(0,6) !== 'search'))
			{
				if ($('#treea_'+M.currentdirid).length == 0)
				{
					var n = M.d[M.currentdirid];
					if (n && n.p) treeUIopen(n.p,false,true);
				}
				treeUIopen(M.currentdirid,M.currentdirid === 'contacts');

				$('#treea_'+M.currentdirid).addClass('opened');
			}
			if (d) console.timeEnd('time for rendering');

			Soon(function() { M.renderPath()});
		}
		if (!n_h) window.location.hash = '#fm/' + M.currentdirid;
		searchPath();
	};

	function sortContactByName(a, b) {
		return parseInt(a.m.localeCompare(b.m));
	}

	this.contacts = function()
	{
		var contacts = [];
		for (var i in M.c['contacts']) contacts.push(M.d[i]);

		if (typeof this.i_cache != "object") this.i_cache = {}

		treePanelSortElements('contacts', contacts, {
			'last-interaction': function(a, b) {
				if (!M.i_cache[a.u])
				{
					var cs = M.contactstatus(a.u);
					if (cs.ts == 0) cs.ts = -1;
					M.i_cache[a.u] = cs.ts;
				}
				if (!M.i_cache[b.u])
				{
					var cs = M.contactstatus(b.u);
					if (cs.ts == 0) cs.ts = -1;
					M.i_cache[b.u] = cs.ts;
				}

				return M.i_cache[a.u] - M.i_cache[b.u]
			},
			name: sortContactByName,
			status: function(a, b) {
				return M.getSortStatus(a.u) - M.getSortStatus(b.u)
			}
		}, sortContactByName)

		var html = '',html2 = '',status='',img;
		// status can be: "online"/"away"/"busy"/"offline"
		for (var i in contacts)
		{
            if(contacts[i].u == u_handle) { // don't show my own contact in the contact & conv. lists
                continue;
            }

			var onlinestatus = M.onlineStatusClass(megaChat.karere.getPresence(megaChat.getJidFromNodeId(contacts[i].u)));
			if (!treesearch || (treesearch && contacts[i].name && contacts[i].name.toLowerCase().indexOf(treesearch.toLowerCase()) > -1))
			{
				html += '<div class="nw-contact-item ' + onlinestatus[1] + '" id="contact_' + htmlentities(contacts[i].u) + '"><div class="nw-contact-status"></div><div class="nw-contact-name">' + htmlentities(contacts[i].name) + ' <a href="#" class="button start-chat-button"></a></div></div>';
			}
		}

		$('.content-panel.contacts').html(html);

        megaChat.renderContactTree();

        //TMP: temporary start chat button event handling
        $('.fm-tree-panel').undelegate('.start-chat-button', 'click.megaChat');
        $('.fm-tree-panel').delegate('.start-chat-button', 'click.megaChat', function() {
            var user_handle = $(this).parent().parent().attr('id').replace("contact_", "");
            window.location = "#fm/chat/" + user_handle;

            return false; // stop propagation!
        });

		$('.fm-tree-panel').undelegate('.nw-contact-item', 'click');
		$('.fm-tree-panel').delegate('.nw-contact-item', 'click',function(e)
        {
			var id = $(this).attr('id');
			if (id) id = id.replace('contact_','');
			M.openFolder(id);

            return false; // stop propagation!
		});
	};

    this.getContacts = function(n) {
        var folders = [];
        for(var i in this.c[n.h]) if (this.d[i].t == 1 && this.d[i].name) folders.push(this.d[i]);

        return folders;
    };

	this.buildtree = function(n, dialog)
	{
		var stype = "cloud-drive";
		// ToDo: What lu represents?
		if (n.h == M.RootID && $('.content-panel.cloud-drive lu').length == 0)
		{
			if (typeof dialog === 'undefined') $('.content-panel.cloud-drive').html('<ul id="treesub_' + htmlentities(M.RootID) + '"></ul>');
				else $('.' + dialog + ' .cloud-drive .dialog-content-block').html('<ul id="mctreesub_' + htmlentities(M.RootID) + '"></ul>');
		}
		else if (n.h == 'shares' && $('.content-panel.shared-with-me lu').length == 0)
		{
			if (typeof dialog === 'undefined') $('.content-panel.shared-with-me').html('<ul id="treesub_shares"></ul>');
				else $('.' + dialog + ' .shared-with-me .dialog-content-block').html('<ul id="mctreesub_shares"></ul>');
			stype = "shared-with-me";
		}
		else if (n.h == M.RubbishID && $('.content-panel.rubbish-bin lu').length == 0)
		{
			if (typeof dialog === 'undefined') $('.content-panel.rubbish-bin').html('<ul id="treesub_' + htmlentities(M.RubbishID) + '"></ul>');
				else $('.' + dialog + ' .rubbish-bin .dialog-content-block').html('<ul id="mctreesub_' + htmlentities(M.RubbishID) + '"></ul>');
			stype = "rubbish-bin";
		}

		if (this.c[n.h])
		{
			var folders = [];
			for(var i in this.c[n.h]) if (this.d[i] && this.d[i].t == 1 && this.d[i].name) folders.push(this.d[i]);
			// sort by name is default in the tree
			treePanelSortElements(stype, folders, {
				name: function(a, b) {
					if (a.name) return a.name.localeCompare(b.name);
				}
			});
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
				var sharedfolder = '';
				if (typeof M.d[folders[i].h].shares !== 'undefined') sharedfolder = ' shared-folder';

				var openedc = '';
				if (M.currentdirid == folders[i].h) openedc = 'opened';

				var k, html = '';
				if (typeof dialog === 'undefined')
				{
					html = '<li id="treeli_' + folders[i].h + '"><span class="nw-fm-tree-item ' + containsc + ' ' + expandedc + ' ' + openedc + '" id="treea_'+ htmlentities(folders[i].h) +'"><span class="nw-fm-arrow-icon"></span><span class="nw-fm-tree-folder' + sharedfolder + '">' + htmlentities(folders[i].name) + '</span></span><ul id="treesub_' + folders[i].h + '" ' + ulc + '></ul></li>';
					k = $('#treeli_'+folders[i].h).length;
				}
				else
				{
					html = '<li id="mctreeli_' + folders[i].h + '"><span class="nw-fm-tree-item ' + containsc + ' ' + expandedc + ' ' + openedc + '" id="mctreea_'+ htmlentities(folders[i].h) +'"><span class="nw-fm-arrow-icon"></span><span class="nw-fm-tree-folder' + sharedfolder + '">' + htmlentities(folders[i].name) + '</span></span><ul id="mctreesub_' + folders[i].h + '" ' + ulc + '></ul></li>';
					k = $('#mctreeli_'+folders[i].h).length;
				}
					
					
				if ((!treesearch || (treesearch && folders[i].name && folders[i].name.toLowerCase().indexOf(treesearch.toLowerCase()) > -1)) && k == 0)
				{
					if (typeof dialog === 'undefined')
					{
						if (folders[i-1] && $('#treeli_' + folders[i-1].h).length > 0) $('#treeli_' + folders[i-1].h).after(html);
						else if (i == 0 && $('#treesub_' + n.h + ' li').length > 0) $($('#treesub_' + n.h + ' li')[0]).before(html);
						else $('#treesub_' + n.h).append(html);
					}
					else
					{
						if (folders[i-1] && $('#mctreeli_' + folders[i-1].h).length > 0) $('#mctreeli_' + folders[i-1].h).after(html);
						else if (i == 0 && $('#mctreesub_' + n.h + ' li').length > 0) $($('#mctreesub_' + n.h + ' li')[0]).before(html);
						else $('#mctreesub_' + n.h).append(html);
					}
				}
				if (buildnode) this.buildtree(folders[i]);
			}
		}
	};

	this.buildSubmenu = function(i, p)
	{

		var icon = '<span class="context-menu-icon"></span>';
		var arrow = '<span class="context-top-arrow"></span><span class="context-bottom-arrow"></span>';
		// divider & advanced
		var adv = '<span class="context-menu-divider"></span><span class="context-menu-item advanced-item"><span class="context-menu-icon"></span>Select Location</span>';

		this.buildRootSubmenu = function()
		{
			$('#sm_move').remove();
			var cs = '';

			for (var h in M.c[M.RootID])
			{
				if (M.d[h].t)
				{
					cs = ' contains-submenu';
					sm = '<span class="context-submenu" id="sm_' + this.RootID + '"><span id="csb_' + this.RootID + '"></span>' + arrow + '</span>';
					break;
				}
			}

			var html = '<span class="context-submenu" id="sm_move"><span id="csb_move">';
			html += '<span class="context-menu-item cloud-item' + cs + '" id="fi_' + this.RootID + '">' + icon + 'Cloud Drive' + '</span>' + sm;
			html += '<span class="context-menu-item remove-item" id="fi_' + this.RubbishID + '">' + icon + 'Rubbish Bin' + '</span>';
			html += adv;
			html += arrow;
			html += '</span></span>';

			$('.context-menu-item.move-item').after(html);
		};

		var id;
		if (typeof i === 'undefined')
		{
			this.buildRootSubmenu();
			id = this.RootID;
		}
		else id = i;

		var folders = [];

		for(var i in this.c[id]) if (this.d[i] && this.d[i].t === 1 && this.d[i].name) folders.push(this.d[i]);

// localeCompare is not supported in IE10, >=IE11 only
// sort by name is default in the tree
		folders.sort(function(a,b)
		{
			if (a.name) return a.name.localeCompare(b.name);
		});
		for (var i in folders)
		{
			var sub = false;
			var cs = '';
			var sm = '';
			var fid = folders[i].h;

			for (var h in M.c[fid])
			{
				if (M.d[h].t)
				{
					sub = true;
					cs = ' contains-submenu';
					sm = '<span class="context-submenu" id="sm_' + fid + '"><span id="csb_' + fid + '"></span>' + arrow + '</span>';
					break;
				}
			}
			var sharedfolder = 'folder-item';
			if (typeof M.d[fid].shares !== 'undefined') sharedfolder = 'shared-folder-item';
			var html = '<span class="context-menu-item ' + sharedfolder + cs + '" id="fi_' + fid + '">' + icon + this.d[fid].name + '</span>' + sm;
			$('#csb_' + id).append(html);
			if (sub) this.buildSubmenu(fid);
		}

		initContextUI();
	};

    this.sortContacts = function(folders) {
        // in case of contacts we have custom sort/grouping:
        if (localStorage.csort) this.csort = localStorage.csort;
        if (localStorage.csortd) this.csortd = parseInt(localStorage.csortd);

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
        else if (this.csort == 'chat-activity')
        {
            folders.sort(function(a,b)
            {
                var aTime = M.u[a.h].lastChatActivity;
                var bTime = M.u[b.h].lastChatActivity;

                if (aTime && bTime)
                {
                    if (aTime > bTime) {
                        return 1 * M.csortd;
                    } else if(aTime < bTime) {
                        return -1 * M.csortd;
                    } else {
                        return 0;
                    }
                }
                else if (aTime && !bTime) return 1*M.csortd;
                else if (!aTime && bTime) return -1*M.csortd;

                return 0;
            });
        }

        return folders;
    }

	this.getPath = function(id)
	{
		var a = [];
		var g=1;
		while(g)
		{
			if (id == 'contacts' && a.length > 1) id = 'shares';

			if (M.d[id] || id == 'contacts' || id == 'messages' || id == 'shares' || id == M.InboxID) a.push(id);
			else if (id.length !== 11) return [];

			if (id == this.RootID || id == 'contacts' || id == 'shares' || id == 'messages' || id == this.RubbishID || id == this.InboxID) g=0;
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
		var name, hasnext='', typeclass;
		var html = '<div class="clear"></div>';
		var a2 = this.getPath(this.currentdirid);

		if (a2.length > 2 && a2[a2.length-2].length == 11) delete a2[a2.length-2];

		for (var i in a2)
		{
			if (a2[i] == this.RootID)
			{
				if (folderlink && M.d[this.RootID])
				{
					name = htmlentities(M.d[this.RootID].name);
					typeclass = 'folder';
				}
				else
				{
					name = '';
					typeclass = 'cloud-drive';
				}
			}
			else if (a2[i] == 'contacts')
			{
				typeclass = 'contacts';
				name = l[165];
			}
			else if (a2[i] == 'shares')
			{
				typeclass = 'shared-with-me';
				name = '';
			}
			else if (a2[i] == this.RubbishID)
			{
				typeclass = 'rubbish-bin';
				name = l[167];
			}
			else if (a2[i] == 'messages' || a2[i] == M.InboxID)
			{
				typeclass = 'messages';
				name = l[166];
			}
			else if (a2[i].length == 11)
			{
				var n = M.d[a2[i]];
				if (n.name) name = n.name;
				typeclass = 'contact';
			}
			else
			{
				name = htmlentities(M.d[a2[i]].name);
				typeclass = 'folder';
			}
			html = '<a class="fm-breadcrumbs ' + typeclass + ' contains-directories ' + hasnext + ' ui-droppable" id="path_'+htmlentities(a2[i])+'"><span class="right-arrow-bg ui-draggable"><span>' +  name + '</span></span></a>' + html;
			hasnext = 'has-next-button';
		}

		if (this.currentdirid && this.currentdirid.substr(0,5) == 'chat/')
		{

            var contactName = $('a.fm-tree-folder.contact.lightactive span.contact-name').text();
			$('.fm-breadcrumbs-block').html('<a class="fm-breadcrumbs contacts contains-directories has-next-button" id="path_contacts"><span class="right-arrow-bg"><span>Contacts</span></span></a><a class="fm-breadcrumbs chat" id="path_'+htmlentities(M.currentdirid.replace("chat/", ""))+'"><span class="right-arrow-bg"><span>' + htmlentities(contactName) + '</span></span></a>');

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

		$('.fm-right-header.fm').removeClass('long-path');
		if (M.pathLength()+260 > $('.fm-right-header.fm').width())
		{
			$('.fm-right-header.fm').addClass('long-path');
			$('.fm-new-folder span').text('');
			$('.fm-file-upload span').text('');
			$('.fm-folder-upload span').text('');
		}

		var el = $('.fm-breadcrumbs-block .fm-breadcrumbs span span');
		var i =0;

		while (M.pathLength()+260 > $('.fm-right-header.fm').width() && i < el.length)
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
                        // Update M.v it's used for at least preview slideshow
                        for (var k in M.v)
                        {
                                if (M.v[k].h === h)
                                {
                                        M.v.splice(k, 1);
                                        break;
                                }
                        }
                        if (typeof M.u.h === 'object') M.u.h.c = 0;
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
//			$('.add-user-popup input').val('');
//			loadingDialog.hide();
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
		var hasItems=false;
		if (sel) for (var h in M.c[M.RubbishID]) { hasItems=true; break; }
		if (!hasItems)
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

	this.copyNodes = function(cn,t,del,callback)
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
				if (callback) callback(res);
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
				// Update M.v it's used for slideshow preview at least
				for (var k in M.v)
				{
					if (M.v[k].h === h)
					{
						M.v.splice(k, 1);
						break;
					}
				}
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
				$('#treea_' + h + ' span:nth-child(2)').text(name);
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
        this.$getLinkPromise = new $.Deferred();

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

        return this.$getLinkPromise;
	}

	this.getlinksDone = function()
	{
        var self = this;

		for (var i in this.links) api_req({a:'l',n:this.links[i]},{
			node : this.links[i],
			last : i == this.links.length-1,
			callback : function(res,ctx)
			{
				if (typeof res != 'number') M.nodeAttr({h:M.d[ctx.node].h,ph:res});

				if (ctx.last)
				{
                    self.$getLinkPromise.resolve();
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
			if (root) dirs.filter(String).forEach(function(p)
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
		// todo cesar: preview parameter indicates that this is a image fpreview download
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

				var p = ui_paused ? 'paused' : ''
				if (!z) this.addToTransferTable('<tr id="dl_'+htmlentities(n.h)+'">'
					+ '<td><span class="row-number"></span></td>'
					+ '<td><span class="transfer-filtype-icon ' + fileicon(n) +'"></span><span class="tranfer-filetype-txt">' + htmlentities(n.name) + '</span></td>'
					+ '<td><span class="transfer-type download '+p+'">' + l[373] + '<span class="speed"></span></span>' + flashhtml + '</td>'
					+ '<td></td>'
					+ '<td>' + bytesToSize(n.s) + '</td>'
					+ '<td><span class="transfer-status queued">Queued</span></td>'
					+ '<td class="grid-url-field"><a class="grid-url-arrow"><span></span></a></td>'
					+ '</tr>');
			}
		}

		if (dlMethod == MemoryIO && ~ua.indexOf(') gecko') && !localStorage.firefoxDialog && $.totalDL > 104857600) Later(firefoxDialog);

		var flashhtml='';
		if (dlMethod == FlashIO) {
			flashhtml = '<object width="1" height="1" id="dlswf_zip_'+ htmlentities(z) + '" type="application/x-shockwave-flash"><param name=FlashVars value="buttonclick=1" /><param name="movie" value="' + document.location.origin + '/downloader.swf"/><param value="always" name="allowscriptaccess"><param name="wmode" value="transparent"><param value="all" name="allowNetworking"></object>';
		}

		var p = ui_paused ? 'paused' : ''
		if (z) this.addToTransferTable('<tr id="zip_'+zipid+'">'
			+ '<td><span class="row-number"></span></td>'
			+ '<td><span class="transfer-filtype-icon ' + fileicon({name:'archive.zip'}) + '"></span><span class="tranfer-filetype-txt">' + htmlentities(zipname) + '</span></td>'
			+ '<td><span class="transfer-type download'+p+'">' + l[373] + '<span class="speed"></span></span>'+ flashhtml +'</td>'
			+ '<td></td>'
			+ '<td>' + bytesToSize(zipsize) + '</td>'
			+ '<td><span class="transfer-status queued">Queued</span></td>'
			+ '<td class="grid-url-field"><a class="grid-url-arrow"><span></span></a></td></tr>');

//		$('.tranfer-view-icon').addClass('active');
//		$('.fmholder').addClass('transfer-panel-opened');
		$.transferHeader();

        if (!preview)
		{
			openTransferpanel();
			initGridScrolling();
			initFileblocksScrolling();
			initTreeScroll();
			setupTransferAnalysis();
			downloading = !!dl_queue.length;
		}

		delete $.dlhash;
	};

	this.dlprogress = function (id, perc, bl, bt,kbps, dl_queue_num, force)
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
					// TODO: check this for suitable GP use
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

		// var failed = parseInt($('#' + id).data('failed') || "0");
		// failed not long ago

		// if (failed+30000 > NOW()) return;

		if (!bl) return false;
		if (!$.transferprogress) $.transferprogress={};
		if (kbps == 0) {
			if (!force && (perc != 100 || $.transferprogress[id])) return false;
		}

		if ($('.transfer-table #' + id + ' .progress-block').length == 0) {
			$('.transfer-table #' + id + ' td:eq(5)').html('<div class="progress-block" style=""><div class="progressbar"><div class="progressbarfill" style="width:0%;"></div></div><div class="clear"></div></div>');
			$.transferHeader();
		}

		// var eltime = (new Date().getTime()-st)/1000;
		var bps = kbps*1000;
		var retime = bps && (bt-bl)/bps;
		if (bt)
		{
			// $.transferprogress[id] = Math.floor(bl/bt*100);
			$.transferprogress[id] = [bl,bt,bps];
			if (!uldl_hold)
			{
				if (slideshowid == dl_queue[dl_queue_num].id && !previews[slideshowid])
				{
					$('.slideshow-error').addClass('hidden');
					$('.slideshow-pending').addClass('hidden');
					$('.slideshow-progress').attr('class','slideshow-progress percents-'+perc);
				}

				$('.transfer-table #' + id + ' .progressbarfill').css('width', perc +'%');
				$('.transfer-table #' + id + ' td:eq(2) .speed').text(" (" + bytesToSize(bps,1) +'/s)');
				//$('.transfer-table #' + id + ' td:eq(4)').text(bytesToSize(bps,1) +'/s');
				//$('.transfer-table #' + id + ' td:eq(3)').text(secondsToTime(eltime));
				$('.transfer-table #' + id + ' td:eq(3)').text(secondsToTime(retime));
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

	this.dlcomplete = function (dl)
	{
		var id = dl.id, z = dl.zipid;

		if (slideshowid == id && !previews[slideshowid])
		{
			$('.slideshow-pending').addClass('hidden');
			$('.slideshow-error').addClass('hidden');
			$('.slideshow-progress').attr('class','slideshow-progress percents-100');
		}

		if (z) id = 'zip_' + z;
		else id = 'dl_' + id;
		$('.transfer-table #' + id + ' td:eq(5)').html('<span class="transfer-status completed">' + l[554] + '</span>');
		$('.transfer-table #' + id + ' td:eq(3)').text('');

		var p = ui_paused ? 'paused' : ''
		if ($('#dlswf_'+id.replace('dl_','')).length > 0)
		{
			var flashid = id.replace('dl_','');
			$('#dlswf_'+flashid).width(170);
			$('#dlswf_'+flashid).height(22);
			$('#' + id + ' .transfer-type ' + p)
				.removeClass('download')
				.addClass('safari-downloaded')
				.text('Save File');
		} else {
			$('.transfer-table #' + id).fadeOut('slow', function(e)
			{
				$(this).remove();
			});
		}
		if (dlMethod == FileSystemAPI)
		{
			setTimeout(fm_chromebar,250,$.dlheight);
			setTimeout(fm_chromebar,500,$.dlheight);
			setTimeout(fm_chromebar,1000,$.dlheight);
		}
		var a=dl_queue.filter(isQueueActive).length;
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

		$.transferHeader();
		Soon(resetUploadDownload);
	}

	this.dlbeforecomplete = function()
	{
		$.dlheight = $('body').height();
	}

	this.dlerror = function(dl, error)
	{
		var errorstr, fileid=dl.dl_id, x;
		if (d) console.log('dlerror',fileid,error);

		switch (error) {
			case ETOOMANYCONNECTIONS:  errorstr = l[18];  break;
			case ESID:                 errorstr = l[19];  break;
			case EBLOCKED:
			case ETOOMANY:
			case EACCESS:              errorstr = l[23];  break;
			case ENOENT:               errorstr = l[22];  break;
			case EKEY:                 errorstr = l[24];  break;
			case EOVERQUOTA:
				if (d) console.log('Quota error');
				// errorstr = l[233];
				// break;
			// case EAGAIN:               errorstr = l[233]; break;
			// case ETEMPUNAVAIL:         errorstr = l[233]; break;
			default:                   errorstr = l[x=233]; break;
		}

		if (slideshowid == dl.id && !previews[slideshowid])
		{
			$('.slideshow-image-bl').addClass('hidden');
			$('.slideshow-pending').addClass('hidden');
			$('.slideshow-progress').addClass('hidden');
			$('.slideshow-error').removeClass('hidden');
			$('.slideshow-error-txt').text(errorstr);
		}

		if (errorstr)  {
			dl.failed = new Date;
			var id = (dl.zipid ? 'zip_' + dl.zipid : 'dl_' + fileid);
			if (x != 233 || !(GlobalProgress[id] || {}).speed) {
				/**
				 * a chunk may fail at any time, don't report a temporary error while
				 * there is network activity associated with the download, though.
				 */
				$('.transfer-table #' + id + ' td:eq(5)')
					.html('<span class="transfer-status error">'+htmlentities(errorstr)+'</span>')
					// .parents('tr').data({'failed' : NOW()});
				//$('.transfer-table #' + id + ' td:eq(4)').text('');
				$('.transfer-table #' + id + ' td:eq(3)').text('--:--:--');
			}
		}
	}

	this.dlstart = function(dl)
	{
		var id = (dl.zipid ? 'zip_' + dl.zipid : 'dl_' + dl.dl_id);
		$('.transfer-table #' + id + ' td:eq(5)').html('<span class="transfer-status initiliazing">'+htmlentities(l[1042])+'</span>');
		$('.transfer-table').prepend($('.transfer-table #' + id));
		Soon(fmUpdateCount);
		dl.st = NOW();
		ASSERT(typeof dl_queue[dl.pos] === 'object', 'No dl_queue entry for the provided dl...');
		ASSERT(typeof dl_queue[dl.pos] !== 'object' || dl.n == dl_queue[dl.pos].n, 'No matching dl_queue entry...');
		if (typeof dl_queue[dl.pos] === 'object') M.dlprogress(id, 0, 0, 0, 0, dl.pos);
		$.transferHeader();
	}
	this.mobileuploads = [];

	this.dynListR = SoonFc(function()
	{
		function flush_cached_nodes(n)
		{
			n = Object.keys(panelDomQueue).slice(0, n);

			if (n.length)
			{
				for (var i in n)
				{
					i = n[i];
					addToTransferTable(i, panelDomQueue[i], 1);
					delete panelDomQueue[i];
				}

				if (M._tfsDynlistR) clearTimeout(M._tfsDynlistR);
				M._tfsDynlistR = setTimeout(function()
				{
					delete M._tfsDynlistR;
					Soon(transferPanelUI);
					Soon(fmUpdateCount);
				}, 350);
				$(window).trigger('resize');
			}
		}
		var $tst = $('.transfer-scrolling-table');
		$tst.unbind('jsp-scroll-y.tfsdynlist');

		if ($('#fmholder').hasClass('transfer-panel-opened'))
		{
			var T = M.getTransferTableLengths();

			if (d) console.log('resize.tfsdynlist', JSON.stringify(T));

			if (T.left > 0) flush_cached_nodes(T.left+1);

			T = T.size;
			$tst.bind('jsp-scroll-y.tfsdynlist', function(ev, pos, top, bot)
			{
				if (bot) flush_cached_nodes(T);
			});
		}
		$tst = undefined;
	});

	this.getTransferTableLengths = function()
	{
		var size = Math.ceil($('.transfer-scrolling-table').height() / 24),
			used = $('.transfer-table tr[id]').length;

		return { size : size, used : used, left : size - used };
	};

	function addToTransferTable(gid, elem, q)
	{
		var target = gid[0] === 'u'
			? $('.transfer-table tr[id^="ul"] .transfer-status.queued:last')
			: $('.transfer-table tr:not([id^="ul"]) .transfer-status.queued:last');

		if (target.length) target.closest('tr').after(elem);
		else
		{
			if (gid[0] != 'u')
			{
				target = $('.transfer-table tr[id^="ul"] .transfer-status.queued:first');
			}

			if (target.length) target.closest('tr').before(elem);
			else $(elem).appendTo('.transfer-table');
		}
		if (!q) Soon(fmUpdateCount);
	}
	this.addToTransferTable = function(elem)
	{
		var T = this.getTransferTableLengths(),
			gid = elem.match(/id="([^"]+)"/).pop();

		if (d) console.log('Adding Transfer', gid, JSON.stringify(T));

		if (this.dynListR)
		{
			$(window).bind('resize.tfsdynlist', this.dynListR);
			delete this.dynListR;
		}

		if (T.left > 0)
		{
			addToTransferTable(gid, elem);
			// In some cases UI is not yet initialized, nor transferHeader()
			$('.transfer-table-header').show(0);
		}
		else
		{
			var fit;

			if (gid[0] !== 'u')
			{
				var dl = $('.transfer-table tr:not([id^="ul"]) .transfer-status.queued:last');

				if (dl.length)
				{
					// keep inserting downloads as long there are uploads
					// dl = +dl.closest('tr').children(':first').text();
					dl = dl.closest('tr').prevAll().length;

					if (dl && dl + 1 < T.used)
					{
						addToTransferTable(gid, elem);
						fit = true;
					}
				}
			}

			if (!fit) panelDomQueue[gid] = elem;
		}
	};

	var __ul_id = 8000;
	this.addUpload = function(u)
	{
		var target = $.onDroppedTreeFolder || M.currentdirid, onChat;
		delete $.onDroppedTreeFolder;

		if ((onChat = (M.currentdirid.substr(0,4) === 'chat')))
		{
			if (!$.ulBunch) $.ulBunch = {};
			if (!$.ulBunch[M.currentdirid]) $.ulBunch[M.currentdirid] = {};
		}

		for (var i in u)
		{
			var f = u[i];
			var ul_id = ++__ul_id;
			if (!f.flashid) f.flashid = false;
			f.target = target;
			f.id = ul_id;

			var p = ui_paused ? 'paused' : ''
			this.addToTransferTable(
				'<tr id="ul_'+ul_id+'">'
					+ '<td><span class="row-number"></span></td>'
					+ '<td><span class="transfer-filtype-icon ' + fileicon({name:f.name}) +'"></span><span class="tranfer-filetype-txt">' + htmlentities(f.name) + '</span></td>'
					+ '<td><span class="transfer-type upload '+p+'">' + l[372] + '<span class="speed"></span></span></td>'
					+ '<td></td>'
					+ '<td>' + bytesToSize(f.size) + '</td>'
					+ '<td><span class="transfer-status queued">Queued</span></td>'
					+ '<td class="grid-url-field"><a class="grid-url-arrow"><span></span></a></td></tr>'
			);
			ul_queue.push(f);

			if (onChat) $.ulBunch[M.currentdirid][ul_id] = 1;
		}
		if (page == 'start') {
			ulQueue.pause();
			uldl_hold = false; /* this isn't a pause generated by the UI */
		}
		else openTransferpanel();

		setupTransferAnalysis();
		ul_uploading = !!ul_queue.length;
	}

	this.ulprogress = function(ul, perc, bl, bt, bps)
	{
		var id = ul.id;

		if ($('.transfer-table #ul_' + id + ' .progress-block').length == 0)
		{
			$('.transfer-table #ul_' + id + ' .transfer-status').removeClass('queued');
			$('.transfer-table #ul_' + id + ' .transfer-status').addClass('download');
			$('.transfer-table #ul_' + id + ' td:eq(5)').html('<div class="progress-block" style=""><div class="progressbar"><div class="progressbarfill" style="width:0%;"></div></div></div>');
			$.transferHeader();
		}
		if (!bl || !ul.starttime) return false;
		var eltime = (new Date().getTime()-ul.starttime)/1000;
		var retime = bps > 1000 ? (bt-bl)/bps : -1;
		if (!$.transferprogress) $.transferprogress={};
		if (bl && bt && !uldl_hold)
		{
			// $.transferprogress[id] = Math.floor(bl/bt*100);
			$.transferprogress['ul_' + id] = [bl,bt,bps];
			$('.transfer-table #ul_' + id + ' .progressbarfill').css('width',perc+'%');
			$('.transfer-table #ul_' + id + ' td:eq(2) .speed').text(
				bps ? (' (' + bytesToSize(bps,1) +'/s' + ')' ) : ''
			);
			//$('.transfer-table #ul_' + id + ' td:eq(5)').text(secondsToTime(eltime));
			$('.transfer-table #ul_' + id + ' td:eq(3)').text(secondsToTime(retime));
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
		percent_megatitle();
	}

	this.ulcomplete = function(ul,h,k)
	{
		var id = ul.id;

		if ($.ulBunch && $.ulBunch[ul.target])
		{
			var ub = $.ulBunch[ul.target], p;
			ub[id] = h;

			for (var i in ub)
			{
				if (ub[i] == 1)
				{
					p = true;
					break;
				}
			}

			if (!p)
			{
				ub = Object.keys(ub).map(function(m) { return ub[m]});
				$(document).trigger('megaulcomplete', [ul.target, ub]);
				delete $.ulBunch[ul.target];
				if (!$.len($.ulBunch)) delete $.ulBunch;
			}
		}

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
		$('.transfer-table #ul_' + id + ' td:eq(5)').html('<span class="transfer-status completed">' + l[554] + '</span>');
		$('.transfer-table #ul_' + id + ' td:eq(3)').text('');

		$('.transfer-table #ul_' + id).fadeOut('slow', function(e)
		{
			$(this).remove();
		});
		var a=ul_queue.filter(isQueueActive).length;
		if (a < 2 && !ul_uploading)
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
		$.transferHeader();
		Soon(resetUploadDownload);
	}

	this.ulstart = function(ul)
	{
		var id = ul.id;

		if (d) console.log('ulstart',id);
		$('.transfer-table #ul_' + id + ' td:eq(5)').html('<span class="transfer-status initiliazing">'+htmlentities(l[1042])+'</span>');
		$('.transfer-table').prepend($('.transfer-table #ul_' + id));
		Soon(fmUpdateCount);
		ul.starttime = new Date().getTime();
		M.ulprogress(ul, 0, 0, 0);
		$.transferHeader();
	};

    this.cloneChatNode = function(n,keepParent) {
        var n2 = clone(n);
        n2.k = a32_to_base64(n2.key);
        delete n2.key,n2.ph,n2.ar;
        if (!keepParent) delete n2.p;
        return n2;
    };
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

	$('.transfer-table #ul_' + fileid + ' td:eq(5)')
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

function fm_safename(name)
{
	// http://msdn.microsoft.com/en-us/library/aa365247(VS.85)
	name = ('' + name).replace(/[:\/\\<">|?*]+/g,'.').replace(/\s*\.+/g,'.');
	if (name.length > 250) name = name.substr(0,250) +'.'+ name.split('.').pop();
	name = name.replace(/\s+/g,' ').trim();
	var end = name.lastIndexOf('.'); end = ~end && end || name.length;
	if(/^(?:CON|PRN|AUX|NUL|COM\d|LPT\d)$/i.test(name.substr(0,end))) name = '!' + name;
	return name;
}

function fm_safepath(path, file)
{
	path = (''+(path||'')).split(/[\\\/]+/).map(fm_safename).filter(String);
	if (file) path.push(fm_safename(file));
	return path;
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
	if (d) console.time('renderfm');
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
    if(MegaChatEnabled) {
        megaChat.renderContactTree();
        megaChat.renderMyStatus();
    }
	if (d) console.timeEnd('renderfm');
}

function rendernew()
{
	if (d) console.time('rendernew');
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

        if(MegaChatEnabled) {
            megaChat.renderContactTree();
            megaChat.renderMyStatus();
        }
	}
	M.buildSubmenu();
	if (newpath) M.renderPath();
	newnodes=undefined;
	if (d) console.timeEnd('rendernew');
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

            if(a.a == 'c') {
                if(megaChat && megaChat.is_initialized) {
                    $.each(a.u, function(k, v) {
                        megaChat[v.c == 0 ? "processRemovedUser" : "processNewUser"](
                            v.u
                        );
                    });
                };
            }
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

            if(megaChat && megaChat.is_initialized) {
                $.each(a.u, function(k, v) {
                    megaChat[v.c == 0 ? "processRemovedUser" : "processNewUser"](
                        v.u
                    );
                });
            };

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
						$('#treea_' + n.h + ' .nw-fm-tree-folder').text(f.name);

						//@@@Todo: reposition elements according to sorting (if sorted by name)
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
	if (p[p.length-1] == 'contacts' || p[p.length-1] == 'shares') return M.d[p[p.length-3]].r;
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

function ddtype(ids,toid,alt)
{
	if (folderlink) return false;

	var r=false, toid_r = RootbyId(toid);
	for (var i in ids)
	{
		var fromid = ids[i], fromid_r;

		if (fromid == toid) return false;
		fromid_r = RootbyId(fromid);

		// never allow move to own inbox, or to own contacts
		if (toid == M.InboxID || toid == 'contacts') return false;

		// to a contact, always allow a copy
		if (toid_r == 'contacts' && M.d[toid].p == 'contacts') r = 'copy';

		// to a shared folder, only with write rights
		if ((toid_r == 'contacts' || toid_r == 'shares') && RightsbyID(toid) > 0)
		{
			if (isCircular(fromid,toid)) return false;
			else r = 'copy';
		}
		// cannot move or copy to the existing parent
		if (toid == M.d[fromid].p) return false;

		// from own cloud to own cloud / trashbin, always move
		if ((toid == M.RootID || toid == M.RubbishID || M.d[toid].t) && (fromid_r == M.RootID) && (toid_r == M.RootID || toid == M.RubbishID))
		{
			if (isCircular(fromid,toid)) return false;
			else r = 'move';
		}
		// from trashbin or inbox to own cloud, always move
		if ((fromid_r == M.RubbishID || fromid_r == M.InboxID) && toid_r == M.RootID) r = 'move';

		// from inbox to trashbin, always move
		if (fromid_r == M.InboxID && toid_r == M.RubbishID) r = 'move';

		// from trashbin or inbox to a shared folder with write permission, always copy
		if ((fromid_r == M.RubbishID || fromid_r == M.InboxID) && (toid_r == 'contacts' || toid_r == 'shares') && RightsbyID(toid) > 0) r = 'copy';

		// copy from a share to cloud
		if ((fromid_r == 'contacts' || fromid_r == 'shares') && (toid == M.RootID  || toid_r == M.RootID)) r = 'copy';

		// move from a share to trashbin only with full control rights (do a copy + del for proper handling)
		if ((fromid_r == 'contacts' || fromid_r == 'shares') && toid == M.RubbishID && RightsbyID(fromid) > 1) r = 'copydel';
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
			$('.create-new-folder').addClass('hidden');
			$('.create-folder-input-bl input').val('');
			newnodes=[];
			M.addNode(res.f[0]);
			rendernew();
			refreshDialogContent();
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

function doshare(h,t, dontShowShareDialog)
{
    var $promise = new $.Deferred();

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
						M.nodeShare(ctx.h,{h:h,r:rights,u:user,ts:Math.floor(new Date().getTime()/1000)});
					}
				}
                if(dontShowShareDialog != true) {
				    $('.fm-dialog.share-dialog').removeClass('hidden');
                }
				loadingDialog.hide();
				M.renderShare(h);

                if(dontShowShareDialog != true) {
                    shareDialog();
                }
                $promise.resolve();
			}
			else
			{
				$('.fm-dialog.share-dialog').removeClass('hidden');
				loadingDialog.hide();
                $promise.reject(res);
			}
		}
	});
    return $promise;
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
