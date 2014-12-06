(function(window) {
	"use strict";

	const webNav = docShell.QueryInterface(Components.interfaces.nsIWebNavigation);
	const _hosts = {
		"mega.co.nz" : 1,
		"mega.is"    : 1,
		"mega.io"    : 1,
		"mega.nz"    : 1,
		"me.ga"      : 1
	};
	var mID = String(Components.stack.filename).split("=").pop();

	addMessageListener("MEGA:"+mID+":bcast", m =>
	{
		m = m.data.split(':');

		if (mID === m[1] && m[2]+m[0] === 'da')
		{
			mID = 0;
		}
	});

	addEventListener("DOMContentLoaded", ev =>
	{
		var doc = ev.originalTarget;
		if (mID && doc.nodeName === "#document")
		{
			var l = doc.location;

			if ((l.protocol === 'https:' || l.protocol === 'http:') && _hosts[l.host] && l.pathname === '/')
			{
				l = 'mega:' + (l.hash ? l.hash : '');

				try
				{
					webNav.loadURI(l,0x80,null,null,null);
				}
				catch(e)
				{
					if (e.result === 0x804b0012) sendSyncMessage('MEGA:'+mID+':loadURI', l);
				}
			}
		}
	});
})(content);
