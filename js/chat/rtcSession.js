
var RTC = null;	
var gLocalStream = null;
var gVolMon = null;
var gVolMonCallback = null;


function RtcSession(stropheConn, options)
{
	if (!RTC)
		throw new Error('This browser does not support webRTC');
	if (!options.remoteVidContainer || !options.localVidContainer)
		throw new Error("No remote or local HTML video container specified");
	this.iceConfig = options.iceServers?options.iceServers:null;
	this.options = options;
	this.audioMuted = false;
	this.videoMuted = false;
    this.PRANSWER = false; // use either pranswer or autoaccept
	this.SEND_VIDEO = true;

    this.connection = stropheConn;
	this.jingle = stropheConn.jingle;
	stropheConn.jingle.rtcSession = this; //needed to access the RtcSession object from jingle event handlers
//muc stuff
    this.myroomjid = null;
    this.roomjid = null;
    this.list_members = [];
//===
	this.jingle.onConnectionEvent = this.onConnectionEvent;
	var self = this;
	if (RtcSession.RAWLOGGING)
	{
		this.connection.rawInput = function (data)
		{ if (RtcSession.RAWLOGGING) console.log('RECV: ' + data); };
		this.connection.rawOutput = function (data)
		{ if (RtcSession.RAWLOGGING) console.log('SEND: ' + data); };
	}
    
    if (options.iceServers)
		this.jingle.ice_config = {iceServers:options.iceServers};
    this.jingle.pc_constraints = RTC.pc_constraints;
   
	var j = this.jingle;
	
	j.eventHandler = this; //all callbacks will be called with this == eventHandler
    j.onCallIncoming = this.onCallIncoming;
    j.onCallTerminated = this.onCallTerminated;
    j.onRemoteStreamAdded = this.onRemoteStreamAdded;
    j.onRemoteStreamRemoved = this.onRemoteStreamRemoved;
    j.onNoStunCandidates = this.noStunCandidates;
    j.onJingleError = this.onJingleError;
	j.onMuted = function(sess, affected)
	{
		$(this).trigger("muted.rtc", [{info:new MuteInfo(affected), sess: sess}]);
	}
	j.onUnmuted = function(sess, affected)
	{
		$(this).trigger("unmuted.rtc", [{info:new MuteInfo(affected), sess: sess}]);
	}
	
    if (RTC.browser == 'firefox')
        this.jingle.media_constraints.mandatory.MozDontOfferDataChannel = true;
}

RtcSession.prototype = 
{
  NO_DTLS: false, //compat with android
  myGetUserMedia: function(options, successCallback, errCallback)
  {
	if (gLocalStream)
	{
		var stream = RTC.cloneMediaStream(gLocalStream, options);		
		this.onMediaReady(stream);
		successCallback.call(this, stream);
		return;
	}

	getUserMediaWithConstraintsAndCallback({audio: true, video: true}, this,
	  function(locstream)
	  {
		gLocalStream = locstream;
		var stream = RTC.cloneMediaStream(gLocalStream, options);		
		this.onMediaReady(stream);
		successCallback.call(this, stream);
	  },
	  function(error, e)
	  {
		var msg = error?error:e;
		if (errCallback)
			errCallback(msg);
		$(this).trigger('rtc.lmediafail', [{error:msg}]);
	  });
 },
 
 onConnectionEvent: function(status, condition)
 {
//WARNING: called directly by Strophe, with this == connection.jingle
    switch (status)
	{
		case Strophe.Status.CONNFAIL:
		case Strophe.Status.DISCONNECTING:
		{
			this.terminateAll(null, null, true);
			if (this.localVid)
				RTC.attachMediaStream($(this.localVid), null);
			break;
		}
		case Strophe.Status.CONNECTED:
		{
			var conn = this.connection;
			var rtcSess = this.connection.rtcSession;
//stanza handlers
			conn.addHandler(RtcSession.onPresenceUnavailable.bind(rtcSess),
			   null, 'presence', 'unavailable', null, rtcSess.peerjid, {matchBare: true});
			this.getStunAndTurnCredentials();
// disco stuff
			if (this.connection.disco) 
			{
				this.connection.disco.addIdentity('client', 'web');
				this.connection.disco.addFeature(Strophe.NS.DISCO_INFO);
			}
			break;
		}
	}
 },

 startMediaCall: function(targetJid, options, myJid)
 {
	this.myGetUserMedia(options,
	 function()
	 {
		this.jingle.initiate(targetJid, myJid ? myJid:this.connection.jid);
		this.peerJid = targetJid;
		$(this).trigger('call-init.rtc', {peer:targetJid});
	 });
 },
 hangup: function(jid, reason, text)
 {
	if (jid)
		this.jingle.terminateByJid(jid, reason, text);
	else
		this.jingle.terminateAll();
 },
 
 muteUnmute: function(state, what, jid)
 {
 	if (what.audio)
	{
		this.audioMuted = state;
		this.sendMuteUnmute(state, 'voice', jid);
	}
	if (what.video)
	{
		this.videoMuted = state;
		this.sendMuteUnmute(state, 'video', jid);
	}
	this.syncMutedState();
 },
 
 sendMuteUnmute: function(muted, what, jid)
 {
	var sessions;
	if (jid)
		sessions = this.getSessionsForJid(jid);
	else
	{
		sessions = [];
		for (var s in this.jingle.sessions)
			sessions.push(this.jingle.sessions[s]);
	}
	for (var i=0; i<sessions.length; i++)
		sessions[i].sendMute(muted, what);
 },
 getSessionsForJid: function(jid)
 {
	var sessions = [];
	jid = Strophe.getBareJidFromJid(jid);
	for(var j in this.jingle.jid2session)
	{
		if (Strophe.getBareJidFromJid(j) == jid)
			sessions.push(this.jingle.jid2session[j]);
	}
	return sessions;
 },
 onPresenceUnavailable: function(pres)
 {
    this.jingle.terminateByJid($(pres).attr('from'));
 },

 onMediaReady: function(stream) 
 {
    this.localStream = stream;
    this.jingle.localStream = stream;
	this.syncMutedState();
    for (var i = 0; i < stream.getAudioTracks().length; i++)
        console.log('using audio device "' + stream.getAudioTracks()[i].label + '"');
    
    for (i = 0; i < stream.getVideoTracks().length; i++)
        console.log('using video device "' + stream.getVideoTracks()[i].label + '"');
    
    // mute video on firefox and recent canary
	var elemClass = "localViewport"; 
	if (stream.getVideoTracks().length < 1)
		elemClass +=" localNoVideo";
	
    if (!this.localVid)
	{
		var vid = $('<video class="'+elemClass+'" autoplay="autoplay" />');
		if (vid.length < 1)
			throw new Error("Failed to create local video element");
		this.localVid = vid[0];
		this.localVid.muted = true;
		this.localVid.volume = 0;

		$(this).trigger('local-media-obtained.rtc', [{stream: stream, player: this.localVid}]);
		maybeCreateVolMon();
		$(this.options.localVidContainer).append($(this.localVid));
	}
	else
		this.localVid.className = elemClass;
		
    RTC.attachMediaStream($(this.localVid), stream);
 },

 
 onCallIncoming: function(sess, ansFunc)
 {
	var self = this;
    $(this).trigger('call-incoming.rtc', [{peer: sess.peerjid, sess:sess, answer:
	 function(answer, options)
	 {
		if (!answer)
		{
			ansFunc({accept: false, reason: 'busy'}); //TODO: This line should not be needed, jingle.terminate(sid) already does it
			return;
		}
		
		self.myGetUserMedia(options, function(stream)
		  {
			ansFunc({accept:true, stream: stream});
		  },
		  function(msg)
		  {
			ansFunc({accept: false, reason: 'busy', text: "There was a problem accessing user's camera or microphone: "+(msg?msg:'')});
		  });
	}}]);
 },

 removeVideo: function(sess)
 {
	var viditem = $(this.options.remoteVidContainer).find('#remotevideo_'+sess.sid);
	if (viditem.length < 1)
	{
		console.error("removeVideo: Video element with sid", sess.sid, "does not exist");
		return false;
	}
	viditem.remove();
	$(this).trigger('remote-player-removed.rtc', [{sess:sess}]);
 },

 onMediaRecv: function(playerElem, sess, stream) 
 {
	if (!this.jingle.sessionIsValid(sess))
	{
		this.error("onMediaRecv received for non-existing session:", sid)
		return;
	}
    $(this).trigger('media-recv.rtc', [{peer: sess.peerjid, sess:sess, stream: stream, player: playerElem}]);
    $(playerElem).appendTo(this.options.remoteVidContainer);
//    sess.getStats(1000);
 },

 onCallTerminated: function(sess, reason, text)
 {
	this.removeVideo(sess);
    $(this).trigger('call-ended.rtc', [{peer: sess.peerjid, sess:sess, reason:reason, text:text}]);
 },

 waitForRemoteMedia: function(playerElem, sess) 
 {
    if (!this.jingle.sessionIsValid(sess))
		return;
	var self = this;
    if (playerElem[0].currentTime > 0) 
	{
        this.onMediaRecv(playerElem, sess, sess.remoteStream);
        RTC.attachMediaStream(playerElem, sess.remoteStream); // FIXME: why do i have to do this for FF?
       // console.log('waitForremotevideo', sess.peerconnection.iceConnectionState, sess.peerconnection.signalingState);
    }
	else
        setTimeout(function () { self.waitForRemoteMedia(playerElem, sess); }, 200);
 },
//onRemoteStreamAdded -> waitForRemoteMedia (waits till time>0) -> onMediaRecv() -> addVideo()
 onRemoteStreamAdded: function(sess, event)
 {
    if ($(this.remoteVidContainer).find('#remotevideo_'+sess.sid).length !== 0)
	{
        console.warn('Ignoring duplicate onRemoteStreamAdded for session', sess.sid); // FF 20
        return;
    }

    $(this).trigger('remote-sdp-recv.rtc', [{peer: sess.peerjid, stream: event.stream, sess:sess}]);
	var elemClass;
	var videoTracks = event.stream.getVideoTracks();
	if (!videoTracks || (videoTracks.length < 1))
	    elemClass = 'rmtViewport rmtNoVideo';
	else
		elemClass = 'rmtViewport rmtVideo';
	
	this.attachRemoteStreamHandlers(event.stream);
    // after remote stream has been added, wait for ice to become connected
    // old code for compat with FF22 beta
	elem = $("<video autoplay='autoplay' class='"+elemClass+"' id='remotevideo_" + sess.sid+"' />");
	RTC.attachMediaStream(elem, event.stream);	
	this.waitForRemoteMedia(elem, sess); //also attaches media stream once time > 0
	
//     does not yet work for remote streams -- https://code.google.com/p/webrtc/issues/detail?id=861
//    var options = { interval:500 };
//    var speechEvents = hark(data.stream, options);

//    speechEvents.on('volume_change', function (volume, treshold) {
//      console.log('volume for ' + sid, volume, treshold);
//    });
 
 },

 onRemoteStreamRemoved: function(event)
 {
 
 },

 noStunCandidates: function() 
 {
	event.data.noStunCandidates = true;
 },


 onJingleError: function(sess, err, stanza, orig)
 {
	if (err.source == 'transportinfo')
		err.source = 'transport-info (i.e. webrtc ice candidate)';
	if (!orig)
		orig = "(unknown)";
	
	if (err.isTimeout)
	{
		console.error('Timeout getting response to "'+err.source+'" packet, session:'+sess.sid+', orig-packet:\n', orig);
		$(this).trigger('jingle-timeout.rtc', [{src: err.source, orig: orig, sess:sess}]);
	}
	else
	{
		if (!stanza)
			stanza = "(unknown)";	
		console.error('Error response to "'+err.source+'" packet, session:', sess.sid,
			'\nerr-packet:\n', stanza, '\norig-packet:\n', orig);
		$(this).trigger('jingle-error.rtc', [{src:err.source, pkt: stanza, orig: orig, sess:sess}]);
	}
 },
 volMonAttachCallback: function(cb)
 {
	gVolMonCallback = cb;
 },
 syncMutedState: function()
 {
	var stream = this.localStream;
	for (var i=0; i<stream.getAudioTracks().length; i++)
		stream.getAudioTracks()[i].enabled = !this.audioMuted;
	for (var i=0; i<stream.getVideoTracks().length; i++)
		stream.getVideoTracks()[i].enabled = !this.videoMuted;
 },
 attachRemoteStreamHandlers: function(stream)
 {
	for (var i=0; i<stream.getAudioTracks().length; i++)
		stream.getAudioTracks()[i].onmute = 
		function(e)
		{
			$(this).trigger('remote-audio-muted.rtc', [stream]);
		};
	for (var i=0; i<stream.getVideoTracks().length; i++)
		stream.getVideoTracks()[i].muted = function(e)
		{
			$(this).trigger('remote-video-muted.rtc', [stream]);
		};
 } 
};

function maybeCreateVolMon()
{
    if (gVolMon)
		return true;
	if (!gVolMonCallback || (typeof hark !== "function"))
		return false;
	
	gVolMon = hark(gLocalStream, { interval: 400 });
    gVolMon.on('volume_change',
		 function (volume, treshold) 
		 {
		 //console.log('volume', volume, treshold);
			var level;
			if (volume > -35)
                level = 100;
			 else if (volume > -60)
                level = (volume + 100) * 100 / 25 - 160;
			else
				level = 0;
			gVolMonCallback(level);
        });
	return true;
}

function MuteInfo(affected)
{
	if (affected.match(/voice/i))
		this.audio = true;
	if (affected.match(/video/i))
		this.video = true;
}

$(document).ready(function()
{
    RTC = setupRTC();
	if (RtcSession.NO_DTLS)
	{
		RTC.pc_constraints.optional.forEach(function(opt)
		{
			if (opt.DtlsSrtpKeyAgreement)
				delete opt.DtlsSrtpKeyAgreement;
		});
	}
})