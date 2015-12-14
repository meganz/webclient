// Karma configuration.

module.exports = function(config) {

  var specific_tests = process.env.SPECIFIC_TEST ? process.env.SPECIFIC_TEST : {pattern: 'test/**/*_test.js', included: true};
  config.set({
    // Base path, that will be used to resolve files and exclude.
    basePath: '',

    // Frameworks to use.
    frameworks: ['mocha', 'chai', 'sinon'],

    // List of files/patterns to load in the browser.
    // {included: false} files are loaded by requirejs
    files: [
        // == Basic test setup ==
        'test/test_main.js',
        'test/test_utils.js',
        // == Test utilities ==
        'node_modules/mocha/mocha.js',
        'node_modules/chai/chai.js',
        'node_modules/karma-chai-plugins/node_modules/sinon-chai/lib/sinon-chai.js',
        'node_modules/sinon/pkg/sinon.js',
        'node_modules/indexeddbshim/dist/indexeddbshim.js',

        // == Basics ==
        'js/vendor/jquery-2.1.4.js',
        'js/vendor/jquery-ui-1.11.4.js',
        'js/vendor/jquery.jscrollpane.js',
        'js/vendor/jquery.mousewheel.js',
        'js/vendor/jquery.fullscreen.js',
        'js/vendor/jquery.qrcode.js',
        'js/jquery.tokeninput.js',
        'js/jquery.misc.js',
        'js/jquery.checkboxes.js',

        // == Libraries ==
        'js/vendor/asmcrypto.js',
        'js/vendor/jsbn.js',
        'js/vendor/jsbn2.js',
        'js/vendor/nacl-fast.js',
        // For notifications.
        'js/vendor/ion.sound.js',
        'js/vendor/favico.js',
        'js/vendor/notification.js',
        'js/vendor/moment.min.js',
        // Chat libraries.
        'js/chat/mpenc.js',
        'js/vendor/chat/strophe.light.js',
        'js/vendor/chat/strophe.disco.js',
        'js/vendor/chat/strophe.jingle.js',
        'js/vendor/chat/strophe.jingle.session.js',
        'js/vendor/chat/strophe.jingle.sdp.js',
        'js/vendor/chat/strophe.jingle.adapter.js',
        'js/vendor/chat/strophe.muc.js',
        'js/vendor/chat/strophe.roster.js',
        'js/vendor/chat/wildemitter.patched.js',
        'js/vendor/chat/hark.patched.js',
        'js/vendor/chat/base32.js',
        // Direct transfer dependencies.
        'js/vendor/chat/cryptojs-core.js',
        'js/vendor/chat/cryptojs-sha1.js',
        'js/vendor/chat/cryptojs-hmac.js',
        'js/vendor/chat/cryptojs-lib-typedarrays.js',
        // Other.
        'js/vendor/autolinker.js',
        'js/vendor/qrcode.js',
        'js/vendor/bitcoin-math.js',
        'js/vendor/db.js',

        // == Test helpers and test configuration ==
        'test/lang_dummy.js',
        'test/config.js',

        // == Our code ==
        'secureboot.js',
        'index.js',
        'js/functions.js',
        'js/datastructs.js',
        'js/mega.js',
        'js/vendor/megaLogger.js',
        'js/tlvstore.js',
        'js/crypto.js',
        'js/megaPromise.js',
        'js/idbkvstorage.js',
        'js/megaDbEncryptionPlugin.js',
        'js/megaDb.js',
        'js/paycrypt.js',
        'js/account.js',
        'js/authring.js',
        'js/fm.js',
        'js/mouse.js',
        'js/filedrag.js',
        'js/mDB.js',
        'js/thumbnail.js',
        'js/vendor/exif.js',
        'js/vendor/megapix.js',
        'js/vendor/smartcrop.js',
        'js/filetypes.js',
        'js/ui/miniui.js',
        'js/ui/filepicker.js',
        'js/ui/dialog.js',
        'js/ui/feedbackDialog.js',
        'js/ui/credentialsWarningDialog.js',
        'js/ui/loginRequiredDialog.js',
        'js/notify.js',
        'js/megaNotifications.js',
        'js/vendor/avatar.js',
        'js/countries.js',
        'js/megaKvStorage.js',
        'js/vendor/int64.js',
        'js/zip64.js',
        'js/cms.js',
        // Google Import Contacts
        'js/gContacts.js',

        // Transfers
        'js/downloadChrome.js',
        'js/downloadMemory.js',
        'js/queue.js',
        'js/downloader.js',
        'js/download2.js',
        'js/upload2.js',
        'js/zip64.js',
        {pattern: 'aesasm.js', included: false},
        {pattern: 'encrypter.js', included: false},

        // Our chat code.
        'js/chat/strongvelope.js',
        'js/chat/opQueue.js',
        'js/chat/rtcStats.js',
        'js/chat/rtcSession.js',
        'js/chat/fileTransfer.js',
        'js/chat/plugins/urlFilter.js',
        'js/chat/plugins/emoticonsFilter.js',
        'js/chat/plugins/attachmentsFilter.js',
        'js/chat/plugins/encryptionFilter.js',
        'js/chat/plugins/chatStore.js',
        'js/chat/plugins/chatNotifications.js',
        'js/chat/plugins/callFeedback.js',
        'js/chat/plugins/callManager.js',
        'js/chat/karereEventObjects.js',
        'js/chat/karere.js',
        //'js/chat/chat.js',
        //'js/chat/chatRoom.js',
        'js/chat/messages.js',
        'js/chat/ui/incomingCallDialog.js',

        // == Tests ==
        (process.env.SKIP_WORKFLOWS)
            ? 'test/config/test_workflows_off.js'
            : 'test/config/test_workflows.js',
        specific_tests
    ],

    // List of files to exclude.
    exclude: [
    ],

    // Fix up to make it work on the Jenkins server.
    urlRoot: '/base',
    proxies: {
        '/': '/'
    },

    // Test results reporter to use.
    // Possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'.
    reporters: ['progress', 'coverage', 'junit'],

    // Source files to generate a coverage report for.
    // (Do not include tests or libraries.
    // These files will be instrumented by Istanbul.)
    preprocessors: {
        'js/**/*.js': ['coverage']
    },

    // Coverage configuration
    coverageReporter: {
        type: 'html',
        dir: 'coverage/'
    },

    // JUnit reporter configuration.
    junitReporter: {
        outputFile: 'test-results.xml'
    },

    // Web server port.
    port: 9876,

    // Enable/disable colours in the output (reporters and logs).
    colors: true,

    // Level of logging.
    // Possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG.
    logLevel: config.LOG_INFO,

    // Enable/disable watching file and executing tests whenever any file changes.
    autoWatch: true,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    // - PhantomJS
    // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
    browsers: [
        'PhantomJS2',
        'PhantomJS2_custom',
        'Firefox',
        'Firefox_Extension',
        'Firefox_NoCookies',
        'Firefox_Incognito',
        'Chrome',
        'Chrome_Incognito',
        'Chrome_Unlimited',
        'Chrome_NoCookies'
    ],

    customLaunchers: {
        'PhantomJS2_custom': {
            base: 'PhantomJS2',
            flags: ['--local-storage-path=./test/phantomjs-storage']
        },
        'Firefox_NoCookies': {
            base: 'Firefox',
            prefs: {
                'network.cookie.cookieBehavior': 2
            }
        },
        'Firefox_Incognito': {
            base: 'Firefox',
            flags: ['-private']
        },
        'Chrome_NoCookies': {
            base: 'Chrome',
            flags: ['--disable-local-storage', '--disable-databases', '--unlimited-storage']
        },
        'Chrome_Incognito': {
            base: 'Chrome',
            flags: ['--incognito']
        },
        'Chrome_Unlimited': {
            base: 'Chrome',
            flags: ['--unlimited-storage']
        },
        'Firefox_Extension': {
            base: (process.env.FXEXTBASE || 'FirefoxDeveloper'),
            prefs: {
                'xpinstall.signatures.required': false
            },
            extensions: [process.env.FXEXTFILE || '/fxextest@mega.co.nz.xpi']
        }
    },

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 120000,
    browserNoActivityTimeout: 120000
  });
};
