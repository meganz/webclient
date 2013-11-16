

if (typeof localStorage == 'undefined')
{
	console.log('Web storage NOT supported');
	// TODO: redirect to browser upgrade page
}

var u_storage;

if (localStorage.sid) u_storage = localStorage;
else u_storage = sessionStorage;

// global variables holding the user's identity
var u_handle;	// user handle
var u_sid;		// session ID
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
		u_storage = ctx.permanent ? localStorage : sessionStorage;
		u_storage.k = JSON.stringify(ks[0]);
		u_storage.sid = ks[1];
		if (ks[2]) u_storage.privk = JSON.stringify(ks[2]);
		u_checklogin(ctx,false);
	}
	else ctx.checkloginresult(ctx,false);
}

// if no valid session present, return false if force == false, otherwise create anonymous account and return 0 if successful or false if error;
// if valid session present, return user type
function u_checklogin(ctx,force,passwordkey,invitecode,invitename,uh)
{
	if (!(u_sid = u_storage.sid))
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
	else u_checklogin3(ctx);
}		
		
function u_checklogin2(ctx,up)
{
	if (up === false) ctx.checkloginresult(ctx,false);
	else
	{
		ctx.result = u_checklogin2a;

		api_getsid(ctx,up[0],ctx.passwordkey);
	}
}

function u_checklogin2a(ctx,ks)
{	
	if (ks === false) ctx.checkloginresult(ctx,false);
	else
	{
		u_k = ks[0];
		u_sid = ks[1];		
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

	if (typeof res != 'object' || typeof res[0] != 'object')
	{
		u_logout();
		r = res;
	}
	else
	{
		u_attr = res[0];		
		var exclude = ['c','email','k','name','p','privk','pubk','s','ts','u','currk'];		
		for (var n in u_attr)
		{				
			if (exclude.indexOf(n) == -1) u_attr[n] = base64urldecode(u_attr[n]);			
		}
		
		u_storage.attr = JSON.stringify(u_attr);
		u_storage.handle = u_handle = u_attr.u;
		try 
		{
			u_k = JSON.parse(u_storage.k);
			if (u_attr.privk) u_privk = JSON.parse(u_storage.privk);
		} catch(e) {
		}
		u_k_aes = new sjcl.cipher.aes(u_k);
		if (!u_attr.email) r = 0;
		else if (!u_attr.c) r = 1;
		else if (!u_attr.privk) r = 2;
		else r = 3;
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
	}
	
	if (logout)
	{
		fminitialized=false;
		notifications = u_sid = u_handle = u_k = u_attr = u_privk = u_k_aes = undefined;
		u_sharekeys={};
		u_nodekeys={};
		u_type=false;
		loggedout=true;
		$('#fmholder').html('');
		$('#fmholder').attr('class','fmholder');
		M = new MegaData();
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

// ensures that a user identity exists, also sets sid
function createanonuser(ctx,passwordkey,invitecode,invitename,uh)
{
	ctx.callback = createanonuser2;

	ctx.passwordkey = passwordkey;

	api_createuser(ctx,invitecode,invitename,uh);
}

function createanonuser2(up,ctx)
{
	if (up === false || !(localStorage.p = ctx.passwordkey) || !(localStorage.handle = up[0])) up = false;

	ctx.createanonuserresult(ctx,up);
}

function setpwreq(newpw,ctx)
{
	var pw_aes = new sjcl.cipher.aes(prepare_key_pw(newpw));
	
	api_req([{ a : 'upkm',
		k : a32_to_base64(encrypt_key(pw_aes,u_k)),
		uh : stringhash(u_attr['email'].toLowerCase(),pw_aes)
	}],ctx);
}

function setpwset(confstring,ctx)
{
	api_req([{ a : 'up',
		uk : confstring
	}],ctx);
}

function changepw(currentpw,newpw,ctx)
{
	var pw_aes = new sjcl.cipher.aes(prepare_key_pw(newpw));

	api_req([{ a : 'up',
		currk : a32_to_base64(encrypt_key(new sjcl.cipher.aes(prepare_key_pw(currentpw)),u_k)),
		k : a32_to_base64(encrypt_key(pw_aes,u_k)),
		uh : stringhash(u_attr['email'].toLowerCase(),pw_aes)
	}],ctx);
}

// an anonymous account must be present - check / create before calling
function sendsignuplink(name,email,password,ctx)
{
	var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));
	var req = { a : 'uc', c : base64urlencode(a32_to_str(encrypt_key(pw_aes,u_k))+a32_to_str(encrypt_key(pw_aes,[rand(0x100000000),0,0,rand(0x100000000)]))), n : base64urlencode(to8(name)), m : base64urlencode(email) };
	
	api_req([req],ctx);
}

function verifysignupcode(code,ctx)
{
	var req = { a : 'ud', c : code };
	
	ctx.callback = verifysignupcode2;

	api_req([req],ctx);
}

var u_signupenck;
var u_signuppwcheck;

function verifysignupcode2(res,ctx)
{
	if (typeof res == 'object' && typeof res[0] == 'object')
	{
		u_signupenck = base64_to_a32(res[0][3]);
		u_signuppwcheck = base64_to_a32(res[0][4]);
		
		ctx.signupcodeok(base64urldecode(res[0][0]),base64urldecode(res[0][1]));
	}
	else ctx.signupcodebad(res[0]);
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
	
	api_req([req],ctx);
}

function processquota1(res,ctx)
{
	if (typeof res == 'object' && typeof res[0] == 'object')
	{
		if (res[0].tah)
		{
			var i;
			
			var tt = 0;
			var tft = 0;
			var tfh = -1;
			
			for (i = 0; i < res[0].tah.length; i++)
			{
				tt += res[0].tah[i];
				
				if (tfh < 0)
				{
					tft += res[0].tah[i];
					
					if (tft > 1048576)
					{
						tfh = i;
					}
				}
			}
			
			ctx.processquotaresult(ctx,[tt,tft,(6-tfh)*3600-res[0].bt,res[0].tar,res[0].tal]);
		}
		else ctx.processquotaresult(ctx,false);
	}
}
