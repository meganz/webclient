(function(Strophe,$) {
	var DiscoNode = function(disco,cfg) {
		this.disco = disco;
		$.extend(this, cfg);
	};

	DiscoNode.prototype.parseRequest = function(iq) {
		if (iq.tree) { return $(Strophe.serialize(iq.tree()));  }
		return $(iq);
	};

	DiscoNode.prototype.fromTo= function(iq) {
		var to = iq.attr('from'), id = iq.attr('id'), res;
		return $iq({to: to, type: 'result', id: id});
	};

	DiscoNode.prototype.addFirstChild = function(req,res) {
		var child = req.find('> *:eq(0)'), childAttr = {};
		if (child.length === 0) { return ; }
		if (child.attr('xmlns')) { childAttr.xmlns = child.attr('xmlns'); }
		if (child.attr('node')) { childAttr.node = child.attr('node'); } 
		if ($.isEmptyObject(childAttr)) { res.c(child[0].tagName); }
		else { res.c(child[0].tagName, childAttr); }
	};

	DiscoNode.prototype.reply = function(iq) {
		var req = this.parseRequest(iq);
		var res = this.fromTo(req);
		this.addFirstChild(req,res);
		this.addContent(req,res);
		return res;
	};

	/// DISCO_INFO 
	DiscoInfoNode = function() { DiscoNode.apply(this,arguments); };
	DiscoInfoNode.prototype = new DiscoNode();
	DiscoInfoNode.prototype.addContent = function(req,res) {
		var nodes = this.features || this.disco.features;
		var identity = this.identity || this.disco.identity;
		res.c('identity', identity).up();
		$.each(nodes, function(node){
			res.c('feature', { 'var' : node}).up();
		});
	};

	/// DISCO_ITEMS
	DiscoItemsNode = function() { DiscoNode.apply(this,arguments); };
	DiscoItemsNode.prototype = new DiscoNode();
	DiscoItemsNode.prototype.addContent = function(req,res) {
		var items = this.items || this.disco.items;
		$.each(items, function(i,item){
			if(!item.jid) { item.jid = this.disco._conn.jid; }
			res.c('item', item).up(); 
		}.bind(this));
		
	};

	/// NODE_NOT_FOUND
	DiscoNodeNotFound = function() { DiscoNode.apply(this,arguments); };
	DiscoNodeNotFound.prototype = new DiscoNode();
	DiscoNodeNotFound.prototype.addContent = function(req,res) {
		res.c('error', { type: 'cancel'});
		res.c('item-not-found', { xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas' });
	};


	function noop(stanza) {
		if (console) { console.log(stanza); }
	}
	Strophe.Disco = {
		DiscoNode: DiscoNode,
		DiscoInfoNode: DiscoInfoNode,
		DiscoNodeNotFound: DiscoNodeNotFound,
		noop: noop
	};
})(Strophe, jQuery);

(function(Strophe,$) {
	var INFO = Strophe.NS.DISCO_INFO;
	var ITEMS = Strophe.NS.DISCO_ITEMS;

	var DiscoNode = Strophe.Disco.DiscoNode;
	var DiscoInfoNode = Strophe.Disco.DiscoInfoNode;
	var DiscoNodeNotFound = Strophe.Disco.DiscoNodeNotFound;
	var noop = Strophe.Disco.noop;

	function request(conn, type, args) {
		var to = args[0], node = args[1], cb = args[2], err = args[3], 
			q = { xmlns: type };
		if(typeof node === 'function') { err = cb; cb = node; node = undefined; }
		if(node) { q.node = node; }
		var	iq = $iq({to: to, 'type': 'get'}).c('query',q);
		conn.sendIQ(iq, cb || noop, err || noop);
	}

	function reply(iq) {
		var node = $('query',iq).attr('node') || $('query',iq).attr('xmlns');
		var nodeImpl = this.features[node] || new DiscoNodeNotFound(); 
		if($.isPlainObject(nodeImpl)) {
			var xmlns = $('query',iq).attr('xmlns');
			var ctr = xmlns === INFO ? DiscoInfoNode : DiscoItemsNode;
			nodeImpl = new ctr(this,nodeImpl);
		}
		this._conn.send(nodeImpl.reply(iq));
		return true;
	}

	var disco = {
		_conn: null,
		init: function(conn) {
			this.jid = conn.jid;
			this.features = {};
			this.identity = { name: 'strophe' };
			this.features[INFO] = new DiscoInfoNode(this);
			this.features[ITEMS] = new DiscoItemsNode(this);
			this._conn = conn;
		},
		statusChanged: function(status) {
			if (status === Strophe.Status.CONNECTED) {
				this._conn.addHandler(reply.bind(this), INFO, 'iq', 'get');
				this._conn.addHandler(reply.bind(this), ITEMS, 'iq', 'get');
			}
		},
		info: function(to, node, callback) {
			request(this._conn, INFO, arguments);
		},
		items: function(to, node, callback) {
			request(this._conn, ITEMS, arguments);
		},
		addNode: function(node, args) {
			if(this.features[node]) { throw node + ' exists'; }
			this.features[node] = args;
		}

	};
	Strophe.addConnectionPlugin('disco', disco);
})(Strophe,jQuery);
