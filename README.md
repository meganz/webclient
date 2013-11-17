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

**js/** contains all generic JavaScript files

**html/** contains all generic HTML files

**js/html/** contains all JavaScript files that belong to the specific HTML file of the parent folder



**js/arkanoid.js** has the arkanoid game which is used to collect entropy for public/private key creation

**js/avatar.js** is used for avatar selection, cropping & scaling (all on the client side in the canvas)

**js/base64.js** base64 library

**js/checkboxes.js** jQuery iOS style checkboexes

**js/cleartemp.js** contains clearIt() which is used to purge temp data from the FileSystem API (Chrome only)

**js/countries.js** contains all the country names (we should translate these at some point)

**js/crypto.js** contains all the cryptographic functions & API handlers

**js/decrypter.js** the decrypter which is used as a web worker to decrypt data while downloading

**js/download.js** contains all the download logic

**js/encrypter.js** the encrypter which is used as a web worker to encrypt data while uploading

**js/exif.js** library that we use to read the EXIF flags from images prior to client side thumbnail creation

**js/filedrag.js** event handlers for the upload buttons, file&folder-drag&drop event handling for upload init.

**js/filetypes.js** contains all the supported file types based on the file extension to match icons

**js/fm.js** core file: contains mainly file manager UI & dialog UI logic

**js/functions.js** contains some generic functions that are used throughout the site

**js.hex.js** HEX conversion functions

