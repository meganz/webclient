(function() {
    var MegaAnalytics = function(id) {
        this.loggerId = id;
        this.sessionId = makeid(16);
    };
    MegaAnalytics.prototype.log = function(c, e, data) {	
	
        data = data || {};
        data = $.extend(
            true,
            {}, {
                'aid': this.sessionId,
                'lang': typeof(lang) !== 'undefined' ? lang : null,
				'browserlang': navigator.language,
                'u_type': typeof(u_type) !== 'undefined' ? u_type : null
            },
            data
        );
		
		if (c == 'pro' && sessionStorage.proref) data['ref'] = sessionStorage.proref;
		
        var msg = JSON.stringify({
            'c': c,
            'e': e,
            'data': data
        });

        if(d) {
            console.log("megaAnalytics: ", c, e, data);
        }
        api_req({ a: 'log',e: this.loggerId, m: msg},  {});
    };
    window.megaAnalytics = new MegaAnalytics(99999);
})();