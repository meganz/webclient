
### Vendor files used by the MEGA WebClient application.

Unless otherwise noted, they were released under a [MIT License].

---
[asmCrypto]: JavaScript Cryptographic Library with performance in mind.

> NB: We're using a custom build, created using:
> 
> ```bash
> git clone https://github.com/vibornoff/asmcrypto.js.git
> git checkout v0.0.10
> npm install
> grunt --with="common,utils,exports,globals,aes,aes-ecb,aes-cbc,aes-ctr,aes-ccm,aes-gcm,aes-exports,aes-ecb-exports,aes-cbc-exports,aes-ctr-exports,aes-ccm-exports,aes-gcm-exports,hash,sha256,sha256-exports,sha512,sha512-exports,hmac,hmac-sha256,hmac-sha512,hmac-sha256-exports,hmac-sha512-exports,rng,rng-exports,rng-globals,bn,bn-exports,rsa,rsa-raw,rsa-keygen-exports,rsa-raw-exports" devel
> ```

---
[Autolinker]: Utility to Automatically Link URLs, Email Addresses, Phone Numbers, Twitter handles, and Hashtags in a given block of text/HTML.

---
[Avatar Picker]: A combination of the source files required for the avatar dialog to work.

---
[bitcoin-math]: JS math for BTC and Satoshi values.

---
[db.js]: Wrapper for IndexedDB to make it easier to work against, making it look more like a queryable API.

> **This is a fork**, [Compare the changes](https://github.com/aaronpowell/db.js/compare/master...meganz:master)

---
[exif-js]: JavaScript library for reading EXIF image metadata.

> **This is a fork**, [Compare the changes](https://github.com/exif-js/exif-js/compare/master...meganz:master)

---
[favico.js]: Make use of your favicon with badges, images or videos.

> **This is a fork**, [Compare the changes](https://github.com/ejci/favico.js/compare/master...meganz:master)

---
[FileSaver]: An HTML5 saveAs() FileSaver implementation.

---
[Int64.js]: Support for representing 64-bit integers in JavaScript.

> **This is a fork**, [Compare the changes](https://github.com/broofa/node-int64/compare/master...meganz:master)

---
[Ion.Sound]: JavaScript plugin for playing sounds and music in browsers

> **This is a fork**, [Compare the changes](https://github.com/IonDen/ion.sound/compare/master...meganz:master)

---
[jQuery]: jQuery JavaScript Library.

---
[jQuery-UI]: jQuery user interface library.

---
[jQuery.fullscreen]: This jQuery plugin provides a simple to use mechanism to control the new fullscreen mode of modern browsers.

---
[jQuery.jScrollPane]: Pretty, customisable, cross browser replacement scrollbars

> **This is a fork**, [Compare the changes](https://github.com/vitch/jScrollPane/compare/master...meganz:master)

---
[jQuery.mousewheel]: A jQuery plugin that adds cross-browser mouse wheel support.

> **This is a fork**, [Compare the changes](https://github.com/jquery/jquery-mousewheel/compare/master...meganz:master)

---
[jQuery.QRCode] & [qrcode.js]: query plugin for a pure browser qrcode generation.

---
[jsbn.js]: basic BigInteger implementation, just enough for RSA encryption and not much more.  
[jsbn2.js]: the rest of the library, including most public BigInteger methods.

> NB: We're shipping a modified jsbn2.js file, _wrapped in a closure and added a code to ONLY export "BigInteger" into the global (window) scope._
> 
> JSBN is released under a [BSD license](http://www-cs-students.stanford.edu/~tjw/jsbn/LICENSE).

---
[MegaLogger]: Minimalistic JavaScript logging framework, specifically usable for the browser console.

---
[MegaPix]: Mega pixel image rendering library

> **This is a fork**, [Compare the changes](https://github.com/stomita/ios-imagefile-megapixel/compare/master...meganz:master)

---
[nacl-fast.js]: Port of TweetNaCl cryptographic library to JavaScript.

---
[notification.js]: A shim polyfill for adding notifications to browsers which offer limited support.

---
[smartcrop.js]: Content aware image cropping.

> **This is a fork**, [Compare the changes](https://github.com/jwagner/smartcrop.js/compare/master...meganz:master)

---
[version-compare.js]: Compares two software version numbers (e.g. "1.7.1" or "1.2b"). This is used to show whether there is a site or extension update available.

---
[zxcvbn.js]: A realistic password strength estimator.




---
---


[MIT License]: <https://opensource.org/licenses/MIT>
[asmCrypto]: <https://github.com/vibornoff/asmcrypto.js>
[Autolinker]: <https://github.com/gregjacobs/Autolinker.js>
[Avatar Picker]: <https://bitbucket.org/atlassianlabs/avatar-picker/>
[bitcoin-math]: <https://github.com/dangersalad/bitcoin-math>
[db.js]: <https://github.com/meganz/db.js>
[exif-js]: <https://github.com/meganz/exif-js>
[favico.js]: <https://github.com/meganz/favico.js>
[FileSaver]: <http://purl.eligrey.com/github/FileSaver.js>
[Int64.js]: <https://github.com/meganz/node-int64>
[Ion.Sound]: <https://github.com/meganz/ion.sound>
[jQuery]: <https://github.com/jquery/jquery>
[jQuery-UI]: <https://github.com/jquery/jquery-ui/>
[jQuery.fullscreen]: <https://github.com/kayahr/jquery-fullscreen-plugin>
[jQuery.jScrollPane]: <https://github.com/meganz/jScrollPane>
[jQuery.mousewheel]: <https://github.com/meganz/jquery-mousewheel>
[jQuery.QRCode]: <https://github.com/jeromeetienne/jquery-qrcode>
[jsbn.js]: <http://www-cs-students.stanford.edu/~tjw/jsbn/>
[jsbn2.js]: <http://www-cs-students.stanford.edu/~tjw/jsbn/>
[MegaLogger]: <https://github.com/meganz/megalogger>
[MegaPix]: <https://github.com/meganz/ios-imagefile-megapixel>
[nacl-fast.js]: <https://github.com/dchest/tweetnacl-js/tree/v0.13.1>
[notification.js]: <https://github.com/MrSwitch/notification.js>
[qrcode-orig.js]: <https://github.com/kazuhikoarase/qrcode-generator>
[qrcode.js]: <https://github.com/jeromeetienne/jquery-qrcode/blob/master/src/qrcode.js>
[smartcrop.js]: <https://github.com/meganz/smartcrop.js>
[version-compare.js]: <https://gist.github.com/TheDistantSea/8021359>
[zxcvbn.js]: <https://github.com/dropbox/zxcvbn>