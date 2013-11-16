MEGA Web client
=====

MEGA provides robust cloud storage with convenient and powerful always-on privacy. MEGA believes in your right to privacy and provides you with the technology tools to protect it. We call it User Controlled Encryption, or UCE, and it happens automatically.

Directory & file structure
=====

**secureboot.js** loads all the resources from static content servers and verifies its authenticity by checking the cryptographic hash.

*Please note that this is not the exact same secureboot.js as we have online at https://mega.co.nz/secureboot.js. We have an automatic process that generates secureboot.js with its cryptographic hashes and all the versioned resource files (file_X.js / file_X.html) as needed based on this respository before prior to updating the live site.*

During development it's essential that your set the following localStorage parameters:
```
localStorage.staticpath = 'http://localhost/mega/';    // path of your local development host
localStorage.dd = 1;	// disables the cryptographic hash verification logic
```
There are also various other localStorage parameters that are useful during development:
```
localStorage.d = 1;		// enables logging
localStorage.contextmenu = 1;	// allows you to disable the contextmenu in the FM for element inspection
```

