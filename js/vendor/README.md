
### Vendor files used by the MEGA WebClient application.

Unless otherwise noted, they were released under a [MIT License].

---
[asmcrypto.js]: asmCrypto - JavaScript Cryptographic Library with performance in mind.

> NB: We are using a custom, unobfuscated build which was created using:
> 
> ```bash
> git clone https://github.com/vibornoff/asmcrypto.js.git
> git checkout v0.0.10
> npm install
> grunt --with="common,utils,exports,globals,aes,aes-ecb,aes-cbc,aes-ctr,aes-ccm,aes-gcm,aes-exports,aes-ecb-exports,aes-cbc-exports,aes-ctr-exports,aes-ccm-exports,aes-gcm-exports,hash,sha256,sha256-exports,sha512,sha512-exports,hmac,hmac-sha256,hmac-sha512,hmac-sha256-exports,hmac-sha512-exports,rng,rng-exports,rng-globals,bn,bn-exports,rsa,rsa-raw,rsa-keygen-exports,rsa-raw-exports" devel
> ```

---
[Autolinker.js]: Utility to Automatically Link URLs, Email Addresses, Phone Numbers, Twitter handles, and Hashtags in a given block of text/HTML.

---
[avatar.js]: Avatar Picker - A slick user experience for uploading, translating and cropping images to be used as avatars.

> **This is a fork**, [See the changes](https://github.com/meganz/avatar-picker/commits/master)

---
[bitcoin-math.js]: JS math for BTC and Satoshi values.

> **This is a fork**, [Compare the changes](https://github.com/dangersalad/bitcoin-math/compare/master...meganz:master)
>
> The bitcoin-math library is released under the [BSD 2-Clause License](https://opensource.org/licenses/BSD-2-Clause).

---
[db.js]: Wrapper for IndexedDB to make it easier to work against, making it look more like a queryable API.

> **This is a fork**, [Compare the changes](https://github.com/aaronpowell/db.js/compare/master...meganz:master)

---
[dcraw.js]: Dave Coffin's raw photo decoder

> NB: This was ported to JavaScript using Emscripten.

---
[exif-js]: JavaScript library for reading EXIF image metadata.

> **This is a fork**, [Compare the changes](https://github.com/exif-js/exif-js/compare/master...meganz:master)

---
[favico.js]: Make use of your favicon with badges, images or videos.

> **This is a fork**, [Compare the changes](https://github.com/ejci/favico.js/compare/master...meganz:master)

---
[filesaver.js]: FileSaver.js - An HTML5 saveAs() FileSaver implementation.

---
[Int64.js]: Support for representing 64-bit integers in JavaScript.

> **This is a fork**, [Compare the changes](https://github.com/broofa/node-int64/compare/master...meganz:master)

---
[ion.sound.js]: JavaScript plugin for playing sounds and music in browsers

> **This is a fork**, [Compare the changes](https://github.com/IonDen/ion.sound/compare/master...meganz:master)

---
[jquery-2.1.4.js]: jQuery JavaScript Library.

---
[jquery-ui-1.11.4.js]: jQuery-UI - jQuery User Interface library.

---
[jquery.fullscreen.js]: This jQuery plugin provides a simple to use mechanism to control the new fullscreen mode of modern browsers.

---
[jquery.jscrollpane.js]: Pretty, customisable, cross browser replacement scrollbars

> **This is a fork**, [Compare the changes](https://github.com/vitch/jScrollPane/compare/master...meganz:master)

---
[jquery.mousewheel.js]: A jQuery plugin that adds cross-browser mouse wheel support.

> **This is a fork**, [Compare the changes](https://github.com/jquery/jquery-mousewheel/compare/master...meganz:master)

---
[jquery.qrcode.js] & [qrcode.js]: jQuery plugin for a pure browser QR code generation.

---
[jsbn.js]: Basic BigInteger implementation, just enough for RSA encryption and not much more.

> **This is a fork**, [See the changes](https://github.com/meganz/jsbn.js/commits/master/jsbn.js)
  
[jsbn2.js]: The rest of the library, including most public BigInteger methods.

---
[megaLogger.js]: Minimalistic JavaScript logging framework, specifically usable for the browser console.

---
[megapix.js]: Mega pixel image rendering library

> **This is a fork**, [Compare the changes](https://github.com/stomita/ios-imagefile-megapixel/compare/master...meganz:master)

---
[nacl-fast.js]: Port of TweetNaCl cryptographic library to JavaScript.

> This is released into the [public domain](https://en.wikipedia.org/wiki/Public_domain_software).

---
[notification.js]: A shim polyfill for adding notifications to browsers which offer limited support.

---
[smartcrop.js]: Content aware image cropping.

> **This is a fork**, [Compare the changes](https://github.com/jwagner/smartcrop.js/compare/master...meganz:master)

---
[version-compare.js]: Compares two software version numbers (e.g. "1.7.1" or "1.2b"). This is used to show whether there is a site or extension update available.

> This is released into the [public domain](https://en.wikipedia.org/wiki/Public_domain_software).

---
[zxcvbn.js]: A realistic password strength estimator.

> NB: We are using a custom, unobfuscated build which was created using:
> 
> ```bash
> git clone https://github.com/dropbox/zxcvbn.git
> cd zxcvbn
> git checkout 1.0.1
> npm install
> nano compile_and_minify.sh
> Comment out or delete the last 4 lines to prevent minification by the Closure compiler
> ./compile_and_minify.sh
> Use output in compiled.js
> ```


---
---


[MIT License]: <https://opensource.org/licenses/MIT>
[asmcrypto.js]: <https://github.com/vibornoff/asmcrypto.js/tree/v0.0.10>
[Autolinker.js]: <https://github.com/gregjacobs/Autolinker.js/tree/0.12.3/dist>
[avatar.js]: <https://github.com/meganz/avatar-picker>
[bitcoin-math.js]: <https://github.com/meganz/bitcoin-math>
[db.js]: <https://github.com/meganz/db.js>
[dcraw.js]: <http://www.cybercom.net/~dcoffin/dcraw/>
[exif-js]: <https://github.com/meganz/exif-js>
[favico.js]: <https://github.com/meganz/favico.js>
[filesaver.js]: <https://github.com/eligrey/FileSaver.js/tree/d8388a1a3c781821caae9110ee3d7c28aa7d6e0b>
[Int64.js]: <https://github.com/meganz/node-int64>
[ion.sound.js]: <https://github.com/meganz/ion.sound>
[jquery-2.1.4.js]: <https://github.com/jquery/jquery/blob/2.1.4/dist/jquery.js>
[jquery-ui-1.11.4.js]: <https://code.jquery.com/ui/1.11.4/jquery-ui.js>
[jquery.fullscreen.js]: <https://github.com/kayahr/jquery-fullscreen-plugin>
[jquery.jscrollpane.js]: <https://github.com/meganz/jScrollPane>
[jquery.mousewheel.js]: <https://github.com/meganz/jquery-mousewheel>
[jquery.qrcode.js]: <https://github.com/jeromeetienne/jquery-qrcode/blob/2bad93deab2f0ec66451b0cc962d56fad6fba403/src/jquery.qrcode.js>
[jsbn.js]: <https://github.com/meganz/jsbn.js>
[jsbn2.js]: <http://www-cs-students.stanford.edu/~tjw/jsbn/>
[megaLogger.js]: <https://github.com/meganz/megalogger>
[megapix.js]: <https://github.com/meganz/ios-imagefile-megapixel>
[nacl-fast.js]: <https://github.com/dchest/tweetnacl-js/tree/v0.13.1>
[notification.js]: <https://github.com/MrSwitch/notification.js/tree/v0.0.1>
[qrcode.js]: <https://github.com/jeromeetienne/jquery-qrcode/blob/2bad93deab2f0ec66451b0cc962d56fad6fba403/src/qrcode.js>
[smartcrop.js]: <https://github.com/meganz/smartcrop.js>
[version-compare.js]: <https://gist.github.com/TheDistantSea/8021359>
[zxcvbn.js]: <https://github.com/dropbox/zxcvbn/tree/1.0.1>
