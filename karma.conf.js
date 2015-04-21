// Karma configuration.

module.exports = function(config) {
  config.set({
    // Base path, that will be used to resolve files and exclude.
    basePath: '',

    // Frameworks to use.
    frameworks: ['mocha', 'chai', 'sinon'],

    // List of files/patterns to load in the browser.
    // {included: false} files are loaded by requirejs
    files: [
        // == Test utilities ==
        'node_modules/mocha/mocha.js',
        'node_modules/chai/chai.js',
        'node_modules/karma-chai-plugins/node_modules/sinon-chai/lib/sinon-chai.js',
        'node_modules/sinon/pkg/sinon.js',

        // == Basics ==
        'js/jquery-2.1.1.js',
        'js/jquery-ui-1.11.2.js',
        'js/jquery.jscrollpane.js',
        'js/jquery.mousewheel.js',
        'js/jquery.tokeninput.js',
        'js/jquery.misc.js',
        'js/jquery.fullscreen.js',
        'js/jquery.qrcode.js',
        'js/jquery.checkboxes.js',
        'js/vendor/jquery.window-active.js',

        // == Libraries ==
        'js/asmcrypto.js',
        'js/jsbn.js',
        'js/jsbn2.js',
        'js/jodid25519.js',
        // For notifications.
        'js/vendor/ion.sound.js',
        'js/vendor/favico.js',
        'js/vendor/notification.js',
        // Chat libraries.
        'js/chat/mpenc.js',
        'js/vendor/chat/strophe.js',
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
        'js/vendor/Autolinker.js',
        'js/vendor/qrcode.js',
        'js/bitcoin-math.js',
        // 'js/vendor/db.js', // Requires IndexedDB, not available for PhantomJS.

        // == Test helpers and test configuration ==
        'test/lang_dummy.js',
        'test/config.js',

        // == Our code ==
        'secureboot.js',
        'index.js',
        'js/functions.js',
        'js/mega.js',
        'js/megaLogger.js',
        'js/tlvstore.js',
        'js/crypto.js',
        'js/megaPromise.js',
        'js/user.js',
        'js/authring.js',
        'js/fm.js',
        'js/mouse.js',
        'js/filedrag.js',
        'js/mDB.js',
        'js/thumbnail.js',
        'js/exif.js',
        'js/megapix.js',
        'js/smartcrop.js',
        'js/filetypes.js',
        'js/miniui.js',
        'js/ui/filepicker.js',
        'js/ui/dialog.js',
        'js/ui/feedbackDialog.js',
        'js/ui/credentialsWarningDialog.js',
        'js/ui/loginRequiredDialog.js',
        'js/notifications.js',
        'js/megaNotifications.js',
        'js/avatar.js',
        'js/countries.js',
        'js/megaDbEncryptionPlugin.js',
        'js/megaDb.js',
        'js/megaKvStorage.js',
        'js/Int64.js',
        'js/zip64.js',
        'js/cms.js',
        // Google Import Contacts
        'js/gContacts.js',

        // Our chat code.
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
        'js/chat/karereEventObjects.js',
        'js/chat/karere.js',
        'js/chat/chat.js',
        'js/chat/chatRoom.js',
        'js/chat/ui/incomingCallDialog.js',

        // == Tests ==
        {pattern: 'test/fixtures/**/*.html', included: false, served: true},
        {pattern: 'test/**/*_test.js', included: true}
    ],

    // List of files to exclude.
    exclude: [
    ],

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
    browsers: ['PhantomJS', 'Firefox', 'Chrome'],

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 120000,
    browserNoActivityTimeout: 120000,

    // Continuous Integration mode.
    // If true, it capture browsers, run tests and exit.
    singleRun: false
  });
};
