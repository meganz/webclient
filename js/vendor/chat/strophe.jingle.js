/* jshint -W117 */
Strophe.addConnectionPlugin('jingle', {
    connection: null,
    sessions: {},
    jid2session: {},
    ice_config: {iceServers: []},
    pc_constraints: {},
    media_constraints: {
        mandatory: {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
        // MozDontOfferDataChannel: true when this is firefox
    },
    localStream: null,

    init: function (conn) {
        this.connection = conn;
		this.eventHandler = this;
//callbacks called by the connection.jingle object
		this.onCallTerminated = function(sess, reason, text){};
		this.onCallIncoming = function(sess){};
		this.onRinging = function(sess){};
		this.onMuted = function(sess, affected){};
		this.onUnmuted = function(sess, affected){};
		this.onInternalError = function(sess, e)
		{console.error("EXCEPTION occurred inside a Strophe stanza handler:", e.stack);};
//callbacks called by session objects
		this.onJingleAck = function(sess, ack){};
		this.onJingleError = function(sess, err, stanza, orig){};
		this.onJingleTimeout = function(sess, err, orig){};
		this.onRemoteStreamAdded = function(sess, event){};
		this.onRemoteStreamRemoved = function(sess, event){};
		this.onIceConnStateChange = function(sess, event){};
		this.onNoStunCandidates = function(sess, event){};
		this.onPacketLoss = function(sess, loss){};
//===
        if (this.connection.disco) {
            // http://xmpp.org/extensions/xep-0167.html#support
            // http://xmpp.org/extensions/xep-0176.html#support
            this.connection.disco.addFeature('urn:xmpp:jingle:1');
            this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:1');
            this.connection.disco.addFeature('urn:xmpp:jingle:transports:ice-udp:1');
            this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:audio');
            this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:video');


            // this is dealt with by SDP O/A so we don't need to annouce this
            //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtcp-fb:0'); // XEP-0293
            //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtp-hdrext:0'); // XEP-0294
            this.connection.disco.addFeature('urn:ietf:rfc:5761'); // rtcp-mux
            //this.connection.disco.addFeature('urn:ietf:rfc:5888'); // a=group, e.g. bundle
            //this.connection.disco.addFeature('urn:ietf:rfc:5576'); // a=ssrc
        }
    },
	statusChanged: function (status, condition) {
        if (status === Strophe.Status.CONNECTED)
			this.connection.addHandler(this.onJingle.bind(this), 'urn:xmpp:jingle:1', 'iq', 'set', null, null);
		if (this.onConnectionEvent)
			this.onConnectionEvent(status, condition);
	},
		
    onJingle: function (iq) {
	 try {
        var sid = $(iq).find('jingle').attr('sid');
		var sess = this.sessions[sid];
		if (sess && sess.answerWaitQueue)
		{
			sess.answerWaitQueue.push(iq);
			return;
		}
        var action = $(iq).find('jingle').attr('action');
        // send ack first
        var ack = $iq({type: 'result',
              to: iq.getAttribute('from'),
              id: iq.getAttribute('id')
        });
        console.log('on jingle', action, 'from', $(iq).attr('from'));

        if ('session-initiate' != action) {
            if (!sess) {
                ack.type = 'error';
                ack.c('error', {type: 'cancel'})
                   .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                   .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                this.connection.send(ack);
                return true;
            }
            // compare from to sess.peerjid (bare jid comparison for later compat with message-mode)
            // local jid is not checked
            if (Strophe.getBareJidFromJid(iq.getAttribute('from')) != Strophe.getBareJidFromJid(sess.peerjid)) {
                console.warn('jid mismatch for session id', sid, iq.getAttribute('from'), sess.peerjid);
                ack.type = 'error';
                ack.c('error', {type: 'cancel'})
                   .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                   .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                this.connection.send(ack);
                return true;
            }
        } else if (sess !== undefined) {
            // existing session with same session id
            // this might be out-of-order if the sess.peerjid is the same as from
            ack.type = 'error';
            ack.c('error', {type: 'cancel'})
               .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up();
            console.warn('duplicate session id', sid);
            return true;
        }
        this.connection.send(ack);
        // see http://xmpp.org/extensions/xep-0166.html#concepts-session
        switch (action) {
        case 'session-initiate':
		{
			var peerjid = $(iq).attr('from');
			debugLog("received INITIATE from", peerjid);
			var sess = this.createSession($(iq).attr('to'), peerjid, $(iq).find('jingle').attr('sid'), this.connection);

			sess.media_constraints = this.media_constraints;
			sess.pc_constraints = this.pc_constraints;
			sess.ice_config = this.ice_config;
			
			var self = this;
			sess.answerWaitQueue = [];
			this.onCallIncoming.call(this.eventHandler, sess, function(obj)
			{
				if (!obj.accept)
				{
					self.terminate(sess, obj.reason, obj.text);
					delete sess.answerWaitQueue;
					return;
				}
				
				sess.initiate(peerjid, false);

				// configure session
				if (self.localStream) {
					sess.localStreams.push(self.localStream);
				}
				if (obj.stream)
					sess.peerconnection.addStream(obj.stream);
				sess.setRemoteDescription($(iq).find('>jingle'), 'offer',
				 function()
				 {
					sess.sendAnswer();
					sess.accept();
//now handle all packets queued up while we were waiting for user's accept of the call
					var queue = sess.answerWaitQueue;
					delete sess.answerWaitQueue;
					for (var i=0; i<queue.length; i++)
						self.onJingle(queue[i]);
				 }, 
				 function(e)
				 {
					delete sess.answerWaitQueue;
					self.terminate(sess, obj.reason, obj.text);
					return;
				 }
				);
			});
            break;
		}
        case 'session-accept':
			debugLog("received ACCEPT from", sess.peerjid);
            sess.setRemoteDescription($(iq).find('>jingle'), 'answer', 
			 function(){sess.accept();});
            break;
        case 'session-terminate':
            console.log('terminating...');
			debugLog("received TERMINATE from", sess.peerjid);
			var reason = null, text = null;
            if ($(iq).find('>jingle>reason').length)
			{
                reason = $(iq).find('>jingle>reason>:first')[0].tagName;
                text = $(iq).find('>jingle>reason>text').text();
            }
			this.terminate(sess, reason, text);
            break;
        case 'transport-info':
			debugLog("received ICE candidate from", sess.peerjid);
            sess.addIceCandidate($(iq).find('>jingle>content'));
            break;
        case 'session-info':
			debugLog("received INFO from", sess.peerjid);
            var affected;
            if ($(iq).find('>jingle>ringing[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                this.onRinging.call(this.eventHandler, sess);
            } else if ($(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                affected = $(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                this.onMuted.call(this.eventHandler, sess, affected);
            } else if ($(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                affected = $(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                this.onUnmuted.call(this.eventHandler, sess, affected);
            }
            break;
        default:
            console.warn('jingle action not implemented', action);
            break;
        }
        return true;
	 } catch(e) {
		this.onInternalError.call(this.eventHandler, this, e);
	 }
    },
    initiate: function (peerjid, myjid) { // initiate a new jinglesession to peerjid
        var sess = this.createSession(myjid, peerjid,
                                     Math.random().toString(36).substr(2, 12), // random string
                                     this.connection);
        // configure session
        if (this.localStream) 
            sess.localStreams.push(this.localStream);
        
        sess.media_constraints = this.media_constraints;
        sess.pc_constraints = this.pc_constraints;
        sess.ice_config = this.ice_config;

        sess.initiate(true);
        sess.sendOffer();
        return sess;
    },
	createSession: function(me, peerjid, sid, conn)
	{
		var sess = new JingleSession(me, peerjid, sid, conn);
        this.sessions[sess.sid] = sess;
        this.jid2session[sess.peerjid] = sess;
		return sess;
	},
    terminateAll: function(reason, text, nosend)
	{
	//terminate all existing sessions
        for (sid in this.sessions) 
			this.terminate(this.sessions[sid], reason, text, nosend);
	},
	terminateBySid: function(sid, reason, text, nosend)
	{
		return this.terminate(this.sessions[sid], reason, text, nosend);
	},
	terminate: function(sess, reason, text, nosend)
	{
		if ((!sess) || (!this.sessions[sess.sid]))
			return false; //throw new Error("Unknown session: " + sid);
        if (sess.state != 'ended') 
		{
            if (!nosend)
				sess.sendTerminate(reason || (!sess.active()) ? 'cancel' : null, text);
            sess.terminate();
        }
        delete this.jid2session[sess.peerjid];
        delete this.sessions[sess.sid];
		this.onCallTerminated.call(this.eventHandler, sess, reason?reason:'term');
		return true;
    },
    terminateByJid: function (jid) 
	{
        var sess = this.jid2session[jid];
		if (!sess)
			return false;
        return this.terminate(sess, null, null, true);
    },
	sessionIsValid: function(sess)
	{
		return (this.sessions[sess.sid] != undefined);
	},
    getStunAndTurnCredentials: function () {
        // get stun and turn configuration from server via xep-0215
        // uses time-limited credentials as described in
        // http://tools.ietf.org/html/draft-uberti-behave-turn-rest-00
        //
        // see https://code.google.com/p/prosody-modules/source/browse/mod_turncredentials/mod_turncredentials.lua
        // for a prosody module which implements this
        //
        // currently, this doesn't work with updateIce and therefore credentials with a long
        // validity have to be fetched before creating the peerconnection
        // TODO: implement refresh via updateIce as described in
        //      https://code.google.com/p/webrtc/issues/detail?id=1650
        this.connection.sendIQ(
            $iq({type: 'get', to: this.connection.domain})
                .c('services', {xmlns: 'urn:xmpp:extdisco:1'}).c('service', {host: 'turn.' + this.connection.domain}),
            function (res) {
                var iceservers = [];
                $(res).find('>services>service').each(function (idx, el) {
                    el = $(el);
                    var dict = {};
                    switch (el.attr('type')) {
                    case 'stun':
                        dict.url = 'stun:' + el.attr('host');
                        if (el.attr('port')) {
                            dict.url += ':' + el.attr('port');
                        }
                        iceservers.push(dict);
                        break;
                    case 'turn':
                        dict.url = 'turn:';
                        if (el.attr('username')) { // https://code.google.com/p/webrtc/issues/detail?id=1508
                            if (navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10) < 28) {
                                dict.url += el.attr('username') + '@';
                            } else {
                                dict.username = el.attr('username'); // only works in M28
                            }
                        }
                        dict.url += el.attr('host');
                        if (el.attr('port') && el.attr('port') != '3478') {
                            dict.url += ':' + el.attr('port');
                        }
                        if (el.attr('transport') && el.attr('transport') != 'udp') {
                            dict.url += '?transport=' + el.attr('transport');
                        }
                        if (el.attr('password')) {
                            dict.credential = el.attr('password');
                        }
                        iceservers.push(dict);
                        break;
                    }
                });
                this.ice_config.iceServers = iceservers;
            },
            function (err) {
                console.warn('getting turn credentials failed', err);
                console.warn('is mod_turncredentials or similar installed?');
            }
        );
        // implement push?
    }
});


	
