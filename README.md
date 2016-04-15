MEGA Web Client
===============

MEGA provides robust cloud storage with convenient and powerful
always-on privacy. MEGA believes in your right to privacy and provides
you with the technology tools to protect it. We call it User
Controlled Encryption (UCE), and it happens automatically.

Secure Boot
-----------

``secureboot.js`` loads all the resources from static content servers
and verifies its authenticity by checking the cryptographic hash.

**Note:** This is not the exact same ``secureboot.js`` as we have
  online at https://mega.nz/``secureboot.js``. We have an automatic
  process that generates ``secureboot.js`` with its cryptographic
  hashes and all the versioned resource files
  (``file_X.js``/``file_X.html``) as needed based on this repository
  before prior to updating the live site.

During development it's essential that your set the following
``localStorage`` parameters:

```
// Path of your local development host.
localStorage.staticpath = 'http://localhost/mega/';
// Disables the cryptographic hash verification logic.
localStorage.dd = 1;
```

There are also various other ``localStorage`` parameters that are
useful during development:

```
// Enables vanilla console logging.
localStorage.d = 1;
// Enables full console logging via MegaLogger.
localStorage.minLogLevel = 0;
// Allows you to disable the context menu in the FM for element inspection.
localStorage.contextmenu = 1;
```


Directories
-----------

* ``js/`` -- contains all generic JavaScript files
* ``html/`` -- contains all generic HTML files
* ``js/html/`` contains all JavaScript files that belong to the
  specific HTML file of the parent folder
* ``js/vendor/`` -- contains all JavaScript files from external developers


Our JavaScript Files
--------------------

* ``secureboot.js`` -- loads all the resources from static content
  servers and verifies its authenticity by checking the cryptographic
  hash
* ``decrypter.js`` -- the decrypter which is used as a web worker to
  decrypt data while downloading
* ``encrypter.js`` -- the encrypter which is used as a web worker to
  encrypt data while uploading
* ``js/avatar.js`` -- is used for avatar selection, cropping & scaling
  (all on the client side in the canvas)
* ``js/cleartemp.js`` -- contains ``clearIt()`` which is used to purge
  temp data from the ``FileSystem`` API (Chrome only)
* ``js/countries.js`` -- contains all the country names (we should
  translate these at some point)
* ``js/crypto.js`` -- contains all the cryptographic functions & API
  handlers
* ``js/download.js`` -- contains all the download logic
* ``js/filedrag.js`` -- event handlers for the upload buttons,
  file&folder-drag&drop event handling for upload init.
* ``js/filetypes.js`` -- contains all the supported file types based
  on the file extension to match icons
* ``js/fm.js`` -- file manager core file, contains mainly file manager
  UI & dialog UI logic
* ``js/functions.js`` -- contains some generic functions that are used
  throughout the site
* ``js/keygen.js`` -- for cryptographic public/private key pair
  creation
* ``js/mDB.js`` -- providers the local database abstraction layer for
  caching of meta-data in ``IndexedDB``
* ``js/mega.js`` -- ``MegaData`` class which does most of the data
  handling (but also some FM UI interaction)
* ``js/mouse.js`` -- captures mouse events for entropy collection
* ``js/notify.js`` -- contains the notifications logic
* ``js/thumbnail.js`` -- client side canvas based thumbnail creation
  (because thumbnails are encrypted, too)
* ``js/upload.js`` -- contains all the upload logic
* ``js/account.js`` -- contains the user creation & login logic
* ``js/zip.js`` -- JavaScript implementation to create ZIP archives of
  multiple files on the client side


Vendor JavaScript Files
-----------------------

* ``aesasm.js`` -- general-purpose cryptographic library
* ``rsaasm.js`` -- general-purpose cryptographic library
* ``sjcl.js`` -- Stanford Javascript Crypto Library.
  This is a modified version with some minor changes, see c211e4ce and de5c3dce

See [js/vendor/README.md](https://github.com/meganz/webclient/blob/master/js/vendor/README.md) for more.
