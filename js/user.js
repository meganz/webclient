


// global variables holding the user's identity
var u_handle;	// user handle
var u_k;		// master key
var u_k_aes;	// master key AES engine
var u_p;		// prepared password
var u_attr;		// attributes
var u_privk;	// private key

// log in
// returns user type if successful, false if not
// valid user types are: 0 - anonymous, 1 - email set, 2 - confirmed, but no RSA, 3 - complete
function u_login(ctx,email,password,uh,permanent)
{
	ctx.result = u_login2;
	ctx.permanent = permanent;
	
	api_getsid(ctx,email,prepare_key_pw(password),uh);
}

function u_login2(ctx,ks)
{
	if (ks !== false)
	{
		localStorage.wasloggedin = true;
		u_logout();
		u_storage = init_storage( ctx.permanent ? localStorage : sessionStorage );
		u_storage.k = JSON.stringify(ks[0]);
		u_storage.sid = ks[1];
		if (ks[2]) u_storage.privk = base64urlencode(crypto_encodeprivkey(ks[2]));
		u_checklogin(ctx,false);
	}
	else ctx.checkloginresult(ctx,false);
}

// if no valid session present, return false if force == false, otherwise create anonymous account and return 0 if successful or false if error;
// if valid session present, return user type
function u_checklogin(ctx,force,passwordkey,invitecode,invitename,uh)
{
	if (u_sid = u_storage.sid)
	{
		api_setsid(u_sid);
		u_checklogin3(ctx);
	}
	else
	{
		if (!force) ctx.checkloginresult(ctx,false);
		else
		{
			u_logout();

			api_create_u_k();

			ctx.createanonuserresult = u_checklogin2;

			createanonuser(ctx,passwordkey,invitecode,invitename,uh);
		}
	}
}
		
function u_checklogin2(ctx,u)
{
	if (u === false) ctx.checkloginresult(ctx,false);
	else
	{
		ctx.result = u_checklogin2a;
		api_getsid(ctx,u,ctx.passwordkey);
	}
}

function u_checklogin2a(ctx,ks)
{	
	if (ks === false) ctx.checkloginresult(ctx,false);
	else
	{
		u_k = ks[0];
		u_sid = ks[1];		
		api_setsid(u_sid);
		u_storage.k = JSON.stringify(u_k);
		u_storage.sid = u_sid;		
		u_checklogin3(ctx);
	}
}

function u_checklogin3(ctx)
{
	ctx.callback = u_checklogin3a;
	api_getuser(ctx);
}
	
function u_checklogin3a(res,ctx)
{
	var r = false;

	if (typeof res != 'object')
	{
		u_logout();
		r = res;
	}
	else
	{
		u_attr = res;
		var exclude = ['c','email','k','name','p','privk','pubk','s','ts','u','currk'];
	
		for (var n in u_attr)
		{
			if (exclude.indexOf(n) == -1)
			{
				try {
					u_attr[n] = from8(base64urldecode(u_attr[n]));
				} catch(e) {
					u_attr[n] = base64urldecode(u_attr[n]);
				}				
			}
		}
		
		u_storage.attr = JSON.stringify(u_attr);
		u_storage.handle = u_handle = u_attr.u;

        init_storage(u_storage);

		try {
			u_k = JSON.parse(u_storage.k);
			if (u_attr.privk) u_privk = crypto_decodeprivkey(base64urldecode(u_storage.privk));
		} catch(e) {
		}

		u_k_aes = new sjcl.cipher.aes(u_k);
		if (!u_attr.email) r = 0;
		else if (!u_attr.c) r = 1;
		else if (!u_attr.privk) r = 2;
		else r = 3;
		
		if (r == 3) {
		    // Load/initialise the authentication system.
		    u_initAuthentication();
		}
	}

	ctx.checkloginresult(ctx,r);
}

// erase all local user/session information
function u_logout(logout)
{	
	var a = [localStorage,sessionStorage];
	for (var i = 2; i--; )
	{
		a[i].removeItem('sid');
		a[i].removeItem('k');
		a[i].removeItem('p');
		a[i].removeItem('handle');
		a[i].removeItem('attr');
		a[i].removeItem('privk');
        a[i].removeItem('keyring');
        a[i].removeItem('puEd255');
        a[i].removeItem('randseed');
	}

	if (logout)
	{
        if(MegaChatEnabled) {
            localStorage.removeItem("audioVideoScreenSize");


            if(megaChat.is_initialized) {
                megaChat.destroy().always(function() {
                    window.megaChat = new Chat();
                    localStorage.removeItem("megaChatPresence");
                    localStorage.removeItem("megaChatPresenceMtime");
                });

                localStorage.removeItem("megaChatPresence");
                localStorage.removeItem("megaChatPresenceMtime");

            }

            if(pubkeysCache && pubkeysCache.clear()) {
                pubkeysCache.clear();
            }
        }

		delete localStorage.signupcode;
		delete localStorage.registeremail;
		if (mDBact)
		{
			mDBact=false;
			localStorage[u_handle + '_mDBactive'];
		}
		fminitialized = false;
		notifications = u_sid = u_handle = u_k = u_attr = u_privk = u_k_aes = undefined;
		api_setsid(false);
		u_sharekeys = {};
		u_nodekeys = {};
		u_type = false;
		loggedout = true;
		$('#fmholder').html('');
		$('#fmholder').attr('class','fmholder');
		M = new MegaData();
		mDBloaded = { 'ok' : 0, 'u' : 0, 'f_sk' : 0,'f' : 0, 's':0 };
		$.hideContextMenu = function () {};
		api_reset();	
		mDBloaded = {'ok':0,'u':0,'f_sk':0,'f':0,'s':0};	
		$.hideContextMenu= function () {};
		if (waitxhr)
		{
			waitxhr.abort();
			waitxhr=undefined;	
		}
	}
}

// true if user was ever logged in with a non-anonymous account
function u_wasloggedin()
{
	return localStorage.wasloggedin;
}

// set user's RSA key
function u_setrsa(rsakey)
{
	var ctx = {
	    callback : function(res,ctx) {
	        if (d) console.log("RSA key put result=" + res);

	        u_privk = rsakey;
	        u_storage.privk = base64urlencode(crypto_encodeprivkey(rsakey));
	        u_type = 3;

	        ui_keycomplete();
	    }
	};

	api_req({ a : 'up', privk : a32_to_base64(encrypt_key(u_k_aes,str_to_a32(crypto_encodeprivkey(rsakey)))), pubk : base64urlencode(crypto_encodepubkey(rsakey)) },ctx);
}


// ensures that a user identity exists, also sets sid
function createanonuser(ctx,passwordkey,invitecode,invitename,uh)
{
	ctx.callback = createanonuser2;

	ctx.passwordkey = passwordkey;

	api_createuser(ctx,invitecode,invitename,uh);
}

function createanonuser2(u,ctx)
{
	if (u === false || !(localStorage.p = ctx.passwordkey) || !(localStorage.handle = u)) u = false;

	ctx.createanonuserresult(ctx,u);
}

function setpwreq(newpw,ctx)
{
	var pw_aes = new sjcl.cipher.aes(prepare_key_pw(newpw));
	
	api_req({ a : 'upkm',
		k : a32_to_base64(encrypt_key(pw_aes,u_k)),
		uh : stringhash(u_attr['email'].toLowerCase(),pw_aes)
	},ctx);
}

function setpwset(confstring,ctx)
{
	api_req({ a : 'up',
		uk : confstring
	},ctx);
}

function changepw(currentpw,newpw,ctx)
{
	var pw_aes = new sjcl.cipher.aes(prepare_key_pw(newpw));

	api_req({ a : 'up',
		currk : a32_to_base64(encrypt_key(new sjcl.cipher.aes(prepare_key_pw(currentpw)),u_k)),
		k : a32_to_base64(encrypt_key(pw_aes,u_k)),
		uh : stringhash(u_attr['email'].toLowerCase(),pw_aes)
	},ctx);
}

// an anonymous account must be present - check / create before calling
function sendsignuplink(name,email,password,ctx)
{
	var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));
	var req = { a : 'uc', c : base64urlencode(a32_to_str(encrypt_key(pw_aes,u_k))+a32_to_str(encrypt_key(pw_aes,[rand(0x100000000),0,0,rand(0x100000000)]))), n : base64urlencode(to8(name)), m : base64urlencode(email) };

	api_req(req,ctx);
}

function verifysignupcode(code,ctx)
{
	var req = { a : 'ud', c : code };

	ctx.callback = verifysignupcode2;

	api_req(req,ctx);
}

var u_signupenck;
var u_signuppwcheck;

function verifysignupcode2(res,ctx)
{
	if (typeof res == 'object')
	{
		u_signupenck = base64_to_a32(res[3]);
		u_signuppwcheck = base64_to_a32(res[4]);
		
		ctx.signupcodeok(base64urldecode(res[0]),base64urldecode(res[1]));
	}
	else ctx.signupcodebad(res);
}

function checksignuppw(password)
{
	var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));
	var t = decrypt_key(pw_aes,u_signuppwcheck);
	
	if (t[1] || t[2]) return false;
	
	u_k = decrypt_key(pw_aes,u_signupenck);
	
	return true;
}

function checkquota(ctx)
{
	var req = { a : 'uq', xfer : 1 };
	
	api_req(req,ctx);
}

function processquota1(res,ctx)
{
	if (typeof res == 'object')
	{
		if (res.tah)
		{
			var i;
			
			var tt = 0;
			var tft = 0;
			var tfh = -1;
			
			for (i = 0; i < res.tah.length; i++)
			{
				tt += res.tah[i];
				
				if (tfh < 0)
				{
					tft += res.tah[i];
					
					if (tft > 1048576) tfh = i;
				}
			}
			
			ctx.processquotaresult(ctx,[tt,tft,(6-tfh)*3600-res.bt,res.tar,res.tal]);
		}
		else ctx.processquotaresult(ctx,false);
	}
}


/**
 * Helper method that will generate a 1 or 2 letter short contact name
 *
 * @param s
 * @param shortFormat
 * @returns {string}
 * @private
 */
function _generateReadableContactNameFromStr(s, shortFormat) {
    if(!s) {
        return "NA";
    }

    if(shortFormat) {
        return s.substr(0,1).toUpperCase();
    } else {
        s = s.split(/[^a-z]/ig);
        s = s[0].substr(0, 1) + (s.length > 1 ? "" + s[1].substr(0, 1) : "");
        return s.toUpperCase();
    }
}

/**
 * Use this when rendering contact's name. Will try to find the contact and render his name (or email, if name is not
 * available) and as a last fallback option, if the contact is not found will render the user_hash (which is not
 * really helpful, but a way to debug)
 *
 * @param user_hash
 * @returns {String}
 */
function generateContactName(user_hash) {
    var contact = M.u[user_hash];
    if(!contact) {
        console.error('contact not found');
    }

    var name;

    if(contact && contact.name) {
        name = contact.name;
    } else if(contact && contact.m) {
        name = contact.m;
    } else {
        name = user_hash;
    }

    return name;
}

/**
 * Generates a div.nw-contact-avatar for a specific user_hash
 *
 * @param user_hash
 * @returns {*|jQuery|HTMLElement}
 */
function generateAvatarElement(user_hash) {
    var $element = $('<div class="nw-contact-avatar"></div>');

    var contact = M.u[user_hash];
    if(!contact) {
        console.error('contact not found');
    }

    var name = generateContactName(user_hash);


    var displayName = name.substr(0,1).toUpperCase();
    var avatar = avatars[contact.u];

    var color = 1;


    if(contact.displayName && contact.displayColor) { // really simple in-memory cache
        displayName = contact.displayName;
        color = contact.displayColor;
    } else {
        $.each(Object.keys(M.u), function(k, v) {
            var c = M.u[v];
            var n = generateContactName(v);

            if(!n || !c) {
                return; // skip, contact not found
            }

            var dn;
            if(displayName.length == 1) {
                dn = _generateReadableContactNameFromStr(n, true);
            } else {
                dn = _generateReadableContactNameFromStr(n, false);
            }

            if(c.u == contact.u) {
                color = Math.min(k+1, 10 /* we have max 10 colors */);
            } else if(dn == displayName) { // duplicate name, if name != my current name
                displayName = _generateReadableContactNameFromStr(n, false);
            }
        });

        contact.displayName = displayName;
        contact.displayColor = color;
    }

    $element.addClass("color" + color);
    if(avatar) {
        $element.append(
            '<img src="' + avatar.url + '"/>'
        );
        $element.data("shortName", displayName); // expose the generated name, so that other components can use it
        $element.data("fullName", name); // expose the generated name, so that other components can use it
    } else {
        $element.text(
            displayName
        );
    }
    return $element;
}

/*
 * Retrieves a user attribute.
 *
 * @param userhandle {string}
 *     Mega's internal user handle.
 * @param attribute {string}
 *     Name of the attribute.
 * @param pub {bool}
 *     True for public attributes (default: true).
 * @param callback {function}
 *     Callback function to call upon completion (default: none).
 * @param ctx {object}
 *     Context, in case higher hierarchies need to inject a context
 *     (default: none).
 */
function getUserAttribute(userhandle, attribute, pub, callback, ctx) {
    if (pub === true || pub === undefined) {
        attribute = '+' + attribute;
    } else {
        attribute = '*' + attribute;
    }
    
    // Assemble context for this async API request.
    var myCtx = ctx || {};
    myCtx.u = userhandle;
    myCtx.ua = attribute;
    myCtx.callback = function(res, ctx) {
        if (typeof res !== 'number') {
            // Decrypt if it's a private attribute container.
            var value = res;
            if (ctx.ua.charAt(0) === '*') {
                var clearContainer = tlvstore.blockDecrypt(base64urldecode(res),
                                                           u_k);
                value = tlvstore.tlvRecordsToContainer(clearContainer);
            }
            if (d) {
                console.log('Attribute "' + ctx.ua + '" for user "' + ctx.u
                            + '" is "' + value + '".');
            }
            if (ctx.callback2) {
                ctx.callback2(value, ctx);
            }
        } else {
            if (d) {
                console.log('Error retrieving attribute "' + ctx.ua
                            + '" for user "' + ctx.u + '": ' + res + '!');
            }
            if (ctx.callback2) {
                ctx.callback2(res, ctx);
            }
        }
    };
    myCtx.callback2 = callback;
    
    // Fire it off.
    api_req({'a': 'uga', 'u': userhandle, 'ua': attribute}, myCtx);
}


/**
 * Stores a user attribute for oneself.
 *
 * @param attribute {string}
 *     Name of the attribute.
 * @param value {object}
 *     Value of the user attribute. Public properties are of type {string},
 *     private ones have to be an object with key/value pairs.
 * @param pub {bool}
 *     True for public attributes (default: true).
 * @param callback {function}
 *     Callback function to call upon completion (default: none). This callback
 *     function expects two parameters: the attribute `name`, and its `value`.
 *     In case of an error, the `value` will be undefined.
 * @param mode {integer}
 *     Encryption mode. One of BLOCK_ENCRYPTION_SCHEME (default: AES_CCM_12_16).
 */
function setUserAttribute(attribute, value, pub, callback, mode) {
    if (mode === undefined) {
        mode = tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_CCM_12_16;
    }
    if (pub === true || pub === undefined) {
        attribute = '+' + attribute;
    } else {
        attribute = '*' + attribute;
        // The value should be a key/value property container. Let's encode and
        // encrypt it.
        value = base64urlencode(tlvstore.blockEncrypt(
            tlvstore.containerToTlvRecords(value), u_k, mode));
    }
    
    // Assemble context for this async API request.
    var myCtx = {
        callback: function(res, ctx) {
            if (d) {
                if (typeof res !== 'number') {
                    console.log('Setting user attribute "'
                                + ctx.ua + '", result: ' + res);
                } else {
                    console.log('Error setting user attribute "'
                                + ctx.ua + '", result: ' + res + '!');
                }
            }
            if (ctx.callback2) {
                ctx.callback2(res, ctx);
            }
        },
        ua: attribute,
        callback2: callback,
    };
    
    // Fire it off.
    var apiCall = {'a': 'up'};
    apiCall[attribute] = value;
    api_req(apiCall, myCtx);
}
