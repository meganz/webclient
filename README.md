MEGA Web client
=====

MEGA provides robust cloud storage with convenient and powerful always-on privacy. MEGA believes in your right to privacy and provides you with the technology tools to protect it. We call it User Controlled Encryption, or UCE, and it happens automatically.

**Directory & file structure**

secureboot.js loads all the resources from static content servers and verifies its authenticity by checking the cryptographic hash

Please note that this is not the exact same secureboot.js as we have online. We have an automatic process that generates secureboot.js with its cryptographic hashes and all the versioned resource files as needed based on this respository before puting it live.

During development it's essential that your set the following localStorage parameters:
```
localStorage.staticpath = 'http://localhost/mega/';    // this should be the path of your local development host
localStorage.dd = 1;	// this disables the cryptographic hash verification logic
```
There are also various other localStorage parameters that are useful during development:
```
localStorage.d = 1;		// this enabled logging
localStorage.contextmenu = 1;	// this allows you to disable our own contextmenu in the file manager if you want to inspect HTML elements
```

