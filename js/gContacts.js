function importGoogleContacts() {
    var access_token_uri = 'https://accounts.google.com/o/oauth2/token';
    var authenticate_uri = 'https://accounts.google.com/o/oauth2/auth';
    var m8_uri = 'https://www.google.com/m8/feeds/';

// *** GOOGLE *** /
    var client_id = '84490490123-gm1t8dol8hisj6j0u1trk1b2ij2a9q9j.apps.googleusercontent.com';
    var redirect_uri = 'http://5d0ec37.ngrok.com';

    var POPUP_WIDTH = 800;
    var POPUP_HEIGHT = 600;

    var g_auth_uri = authenticate_uri + '?'
            + '&response_type=token'
            + '&client_id=' + client_id
            + '&redirect_uri=' + redirect_uri
            + '&scope=' + m8_uri
            + '&state=' + String(Math.random());// Create random string
//            + '&approval_prompt=force'
//            + '&include_granted_scopes=true';

    var tmpLeft = (window.screen.availWidth - POPUP_WIDTH) / 2;
    var tmpTop = (window.screen.availHeight - POPUP_HEIGHT) / 2;
    var leftPix = Math.floor(tmpLeft);
    var topPix = Math.floor(tmpTop);

    var win = window.open(
            g_auth_uri,
            "GoogleAuthenticate",
            'width=' + POPUP_WIDTH + ', height=' + POPUP_HEIGHT + ', left=' + leftPix + ', top=' + topPix
            );

    var pollTimer = window.setInterval(function() {
        try {
            console.log(win.document.URL);
            if (win.document.URL.indexOf(redirect_uri) != -1) {
                window.clearInterval(pollTimer);
                var url = win.document.URL;
                accessToken = extractQueryValue(url, 'access_token');
                win.close();
                getContactList();
            }
        } catch (e) {
        }
    }, 500);
}

function getContactList() {
	var ACAO = 'http://5d0ec37.ngrok.com';
    var data = {
        access_token: accessToken,
        v: '3.0'
    };

    $.ajax({
        beforeSend: function(request)
        {
			if (ACAO !== '')
				request.setRequestHeader("Access-Control-Allow-Origin", ACAO);
        },
        type: 'GET',
        url: "https://www.google.com/m8/feeds/contacts/default/full",
        dataType: "jsonp",
        data: data,
        success: function(data) {
            var jsonData = readAllEmails(data);
//            $('body').append(JSON.stringify(jsonData));
        }});
}

function xPathNameSpaceResolver(prefix) {
    var ns = {
        'def': 'http://www.w3.org/2005/Atom',
        'gd': 'http://schemas.google.com/g/2005'
    };

    return ns[prefix] || null;
}

function readAllEmails(xml) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xml, 'text/xml');
    var emails = xmlDoc.evaluate("/def:feed/def:entry/gd:email/@address", xmlDoc, xPathNameSpaceResolver, 4, null);
//        var names = xmlDoc.evaluate("/def:feed/def:entry/def:title", xmlDoc, nameSpace, 4, null);
    var index = 0;
//    var jsonData = {};
	var data = [];

    var node = emails.iterateNext();
    while (node)
	{
		data.push(node.value);
//        jsonData[node.value] = (index);
//        node = emails.iterateNext();
//        index++;
    }
    return jsonData;
}

function validateToken(accessToken) {
    var data = {access_token: accessToken};

    // Validate access token
    $.get("https://www.googleapis.com/oauth2/v1/tokeninfo", data, function(data) {
        return true;
    });
}

function extractQueryValue(url, name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\#&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    if (results == null)
        return "";
    else
        return results[1];
}
