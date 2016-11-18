
### Vendor files used by the MEGA WebClient application.

Unless otherwise noted, they were released under a [MIT License].

---
[asmcrypto.js]: asmCrypto - JavaScript Cryptographic Library with performance in mind.

> **This is a fork**, [Compare the changes](https://github.com/vibornoff/asmcrypto.js/compare/master...meganz:master)
>
> NB: We are using a custom, unobfuscated build which was created using:
> 
> ```bash
> git clone https://github.com/meganz/asmcrypto.js.git
> cd asmcrypto.js
> build.sh
> ```
>
> If that doesn't creates an 1:1 copy, try `build.sh master` (that'll build the file from master, as opposed to latest tagged version)

---
[autolinker.js]: Utility to Automatically Link URLs, Email Addresses, Phone Numbers, Twitter handles, and Hashtags in a given block of text/HTML.

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
[dexie.js]: A Minimalistic Wrapper for IndexedDB

> Released under the [Apache License Version 2.0](http://www.apache.org/licenses/).

---
[dcraw.js]: Dave Coffin's raw photo decoder [dcraw.c](http://www.cybercom.net/~dcoffin/dcraw/) ported to JavaScript using [Emscripten]

> NB: To compile from C source, fork the repo and run `build.sh`.

---
[es6-shim]: ECMAScript 6 compatibility shims for legacy JavaScript engines.

> **This is a fork**, [Compare the changes](https://github.com/paulmillr/es6-shim/compare/master...meganz:master)

---
[exif-js]: JavaScript library for reading EXIF image metadata.

> **This is a fork**, [Compare the changes](https://github.com/exif-js/exif-js/compare/master...meganz:master)

---
[favico.js]: Make use of your favicon with badges, images or videos.

> **This is a fork**, [Compare the changes](https://github.com/ejci/favico.js/compare/master...meganz:master)

---
[filesaver.js]: FileSaver.js - An HTML5 saveAs() FileSaver implementation.

---
[int64.js]: Support for representing 64-bit integers in JavaScript.

> **This is a fork**, [Compare the changes](https://github.com/broofa/node-int64/compare/master...meganz:master)

---
[ion.sound.js]: JavaScript plugin for playing sounds and music in browsers

> **This is a fork**, [Compare the changes](https://github.com/IonDen/ion.sound/compare/master...meganz:master)

---
[jquery-2.2.1.js]: jQuery JavaScript Library.

---
[jquery-ui.js]: jQuery-UI - jQuery User Interface library.

> This is a custom build created from: [https://jqueryui.com/download/#!...](https://jqueryui.com/download/#!version=1.12.1&themeParams=none&components=111101011101111110100010110110001000001000000000)

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
[moment.js]: Parse, validate, manipulate, and display dates in JavaScript.

---
[nacl-fast.js]: Port of TweetNaCl cryptographic library to JavaScript.

> This is released into the [public domain](https://en.wikipedia.org/wiki/Public_domain_software).

---
[notification.js]: A shim polyfill for adding notifications to browsers which offer limited support.

---
[react-dom.js, react.js]: A declarative, efficient, and flexible JavaScript library for building user interfaces.

---
[smartcrop.js]: Content aware image cropping.

> **This is a fork**, [Compare the changes](https://github.com/jwagner/smartcrop.js/compare/master...meganz:master)

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
[chat/strophe.light.js]: Strophe.js is an XMPP library for JavaScript.

> NB: This is the **light** version built as follow:
> 
> ```bash
> git clone https://github.com/strophe/strophejs.git
> cd strophejs
> git checkout v1.2.8
> npm install
> make strophe.light.js
> make check
> ```

---

[MIT License]: <https://opensource.org/licenses/MIT>
[Emscripten]: <http://emscripten.org/>
[asmcrypto.js]: <https://github.com/meganz/asmcrypto.js>
[autolinker.js]: <https://github.com/gregjacobs/Autolinker.js/tree/0.12.3/dist>
[avatar.js]: <https://github.com/meganz/avatar-picker>
[bitcoin-math.js]: <https://github.com/meganz/bitcoin-math>
[db.js]: <https://github.com/meganz/db.js>
[dexie.js]: <https://github.com/dfahlander/Dexie.js>
[dcraw.js]: <https://github.com/meganz/dcraw.js>
[es6-shim]: <https://github.com/meganz/es6-shim>
[exif-js]: <https://github.com/meganz/exif-js>
[favico.js]: <https://github.com/meganz/favico.js>
[filesaver.js]: <https://github.com/eligrey/FileSaver.js/tree/d8388a1a3c781821caae9110ee3d7c28aa7d6e0b>
[int64.js]: <https://github.com/meganz/node-int64>
[ion.sound.js]: <https://github.com/meganz/ion.sound>
[jquery-2.2.1.js]: <https://github.com/jquery/jquery/blob/2.2.1/dist/jquery.js>
[jquery-ui.js]: <https://code.jquery.com/ui/1.12.1/jquery-ui.js>
[jquery.fullscreen.js]: <https://github.com/kayahr/jquery-fullscreen-plugin/tree/5c95707f9ebf3d4962e9057b09cc43c10f11c3f4>
[jquery.jscrollpane.js]: <https://github.com/meganz/jScrollPane>
[jquery.mousewheel.js]: <https://github.com/meganz/jquery-mousewheel>
[jquery.qrcode.js]: <https://github.com/jeromeetienne/jquery-qrcode/blob/2bad93deab2f0ec66451b0cc962d56fad6fba403/src/jquery.qrcode.js>
[jsbn.js]: <https://github.com/meganz/jsbn.js>
[jsbn2.js]: <http://www-cs-students.stanford.edu/~tjw/jsbn/>
[megaLogger.js]: <https://github.com/meganz/megalogger>
[megapix.js]: <https://github.com/meganz/ios-imagefile-megapixel>
[moment.js]: <https://github.com/moment/moment/tree/2.10.6>
[nacl-fast.js]: <https://github.com/dchest/tweetnacl-js/tree/v0.13.1>
[notification.js]: <https://github.com/MrSwitch/notification.js/tree/v0.0.1>
[qrcode.js]: <https://github.com/jeromeetienne/jquery-qrcode/blob/2bad93deab2f0ec66451b0cc962d56fad6fba403/src/qrcode.js>
[react-dom.js, react.js]: https://github.com/facebook/react/tree/v0.14.8
[smartcrop.js]: <https://github.com/meganz/smartcrop.js>
[zxcvbn.js]: <https://github.com/dropbox/zxcvbn/tree/1.0.1>
[chat/strophe.light.js]: <https://github.com/strophe/strophejs>
