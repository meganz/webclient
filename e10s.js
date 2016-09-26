(function(window) {
	"use strict";

	Components.utils.import('resource://gre/modules/Services.jsm');

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
			else if (l.protocol === 'mega:'
					&& Services.appinfo.processType
					== Services.appinfo.PROCESS_TYPE_CONTENT
					|| l.host === 'bug1305316.nz') {

				sendSyncMessage('MEGA:'+mID+':loadURI', 'mega:' + (l.hash ? l.hash : ''));
			}
			else if (l.host === 'adf.ly') {
				var win = doc.defaultView;

				try {
					var str = doc.head.textContent.match(/ysmm\s*=\s*['"](.*?)['"]/)[1];
					var chunk = ['', ''];

					for (var i in str) {
						if (!(i % 2)) {
							chunk[0] += str[i];
						}
						else {
							chunk[1] = str[i] + chunk[1];
						}
					}

					var link = atob(chunk.join("")).substr(2).toLowerCase();
					if (/^https:\/\/mega\.nz/.test(link)) {
						sendAsyncMessage('MEGA:'+mID+':event', {name: 'mega-event-log4', link: l.href, target: link});
						win.location = link;
					}
				}
				catch (ex) {}
			}
		}
	});
})(content);
