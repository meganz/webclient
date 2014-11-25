function importGoogleContacts(where) {
    var isImported = false,
        access_token_uri = 'https://accounts.google.com/o/oauth2/token',
        authenticate_uri = 'https://accounts.google.com/o/oauth2/auth',
        m8_uri = 'https://www.google.com/m8/feeds/',
        // *** GOOGLE *** /
        client_id = '84490490123-si7f8qcg952ul35rokm0c0ao9b5oie76.apps.googleusercontent.com',
        redirect_uri = 'https://beta.developers.mega.co.nz/newdesign/',
        POPUP_WIDTH = 800,
        POPUP_HEIGHT = 600,
        tmpLeft = (window.screen.availWidth - POPUP_WIDTH) / 2,
        tmpTop = (window.screen.availHeight - POPUP_HEIGHT) / 2,
        leftPix = Math.floor(tmpLeft),
        topPix = Math.floor(tmpTop);

    var g_auth_uri = authenticate_uri + '?'
        + '&response_type=token'
        + '&client_id=' + client_id
        + '&redirect_uri=' + redirect_uri
        + '&scope=' + m8_uri
        + '&state=' + String(Math.random());// Create random string
//            + '&approval_prompt=force'
//            + '&include_granted_scopes=true';

    var win = window.open(
        g_auth_uri,
        "GoogleAuthenticate",
        'width=' + POPUP_WIDTH + ', height=' + POPUP_HEIGHT + ', left=' + leftPix + ', top=' + topPix
        );

    var pollTimer = window.setInterval(function () {
        try {
            console.log(win.document.URL);
            if (win.document.URL.indexOf(redirect_uri) != -1) {
                window.clearInterval(pollTimer);
                var url = win.document.URL;
                accessToken = extractQueryValue(url, 'access_token');
                win.close();
                isImported = getContactList(where);
            }
        } catch (e) {
        }
    }, 500);

    return isImported;
}

/**
 * 
 * @param {boolean} false = addContacts, true=share dialog
 * @returns {undefined}
 */
function getContactList(where) {
    var ACAO = 'https://beta.developers.mega.co.nz/newdesign/',
        data = {
            access_token: accessToken,
            v: '3.0'
        },
        imported = false;

    $.ajax({
        beforeSend: function (request) {
            if (ACAO !== '') {
                request.setRequestHeader("Access-Control-Allow-Origin", ACAO);
            }
        },
        type: 'GET',
        url: "https://www.google.com/m8/feeds/contacts/default/full",
        dataType: "jsonp",
        data: data,
        done: function (data) {
            var gData = readAllEmails(data);
            if (where === 'shared') {
                addImportedDataToSharedDialog(gData, 'gmail');
            }
            else if (where === 'contacts') {
                addImportedDataToAddContactsDialog(gData, 'gmail');
            }
            $('.import-contacts-dialog').fadeOut(200);
            $('.import-contacts-link').removeClass('active');

            imported = true;
        }
    });

    return imported;
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
    var arrData = [];

    var node = emails.iterateNext();
    while (node) {
        arrData.push(node.value);
//        jsonData[node.value] = (index);
        node = emails.iterateNext();
    }
//    return jsonData;
    return arrData;
}

function validateToken(accessToken) {
    var data = {access_token: accessToken};

    // Validate access token
    $.get("https://www.googleapis.com/oauth2/v1/tokeninfo", data, function (data) {
        return true;
    });
}

function extractQueryValue(url, name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\#&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    if (results == null) {
        return "";
    } else {
        return results[1];
    }
}
