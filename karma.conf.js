// Karma configuration.

module.exports = function(config) {

  var specific_tests = process.env.SPECIFIC_TEST || 'test/**/*_test.js';

  config.set({
    // Base path, that will be used to resolve files and exclude.
    basePath: '',

    // Frameworks to use.
    frameworks: ['mocha', 'chai', 'sinon-chai'],

    // List of files/patterns to load in the browser.
    // {included: false} files are loaded by requirejs
    files: [
        // == Basic test setup ==
        'test/test_main.js',
        'test/test_utils.js',

        // == Basics ==
        'js/vendor/jquery.js',
        'js/vendor/jquery-ui.js',
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
        'js/vendor/notification.js',
        'js/vendor/moment.js',

        // Other.
        'js/vendor/autolinker.js',
        'js/vendor/qrcode.js',
        'js/vendor/megaLogger.js',

        // == Test helpers and test configuration ==
        'test/lang_dummy.js',
        'test/config.js',

        // Shim for ES6 features some browsers may not have (PhantomJS, MSIE).
        'js/vendor/es6-shim.js',
        'js/vendor/dexie.js',

        // == Our code ==
        'secureboot.js',
        'index.js',
        'nodedec.js',
        'js/utils/polyfills.js',
        'js/utils/browser.js',
        'js/utils/debug.js',
        'js/utils/conv.js',
        'js/utils/crypt.js',
        'js/utils/dom.js',
        'js/utils/events.js',
        'js/utils/locale.js',
        'js/utils/media.js',
        'js/utils/network.js',
        'js/utils/stringcrypt.js',
        'js/utils/timers.js',
        'js/utils/watchdog.js',
        'js/utils/workers.js',
        'js/functions.js',
        'js/datastructs.js',
        'js/mega.js',
        'js/fm.js',
        'js/fm/account.js',
        'js/fm/filemanager.js',
        'js/fm/achievements.js',
        'js/fm/dashboard.js',
        'js/fm/removenode.js',
        'js/fm/ufssizecache.js',
        'js/fm/utils.js',
        'js/fm/megadata.js',
        'js/fm/megadata/account.js',
        'js/fm/megadata/avatars.js',
        'js/fm/megadata/contacts.js',
        'js/fm/megadata/filters.js',
        'js/fm/megadata/inbox.js',
        'js/fm/megadata/menus.js',
        'js/fm/megadata/nodes.js',
        'js/fm/megadata/openfolder.js',
        'js/fm/megadata/render.js',
        'js/fm/megadata/reset.js',
        'js/fm/megadata/sort.js',
        'js/fm/megadata/transfers.js',
        'js/fm/megadata/tree.js',
        'js/tlvstore.js',
        'js/crypto.js',
        'js/megaPromise.js',
        'js/idbkvstorage.js',
        'sjcl.js',
        'js/mDB.js',
        'js/sharedlocalkvstorage.js',
        'js/paycrypt.js',
        'js/attr.js',
        'js/account.js',
        'js/authring.js',
        'js/mouse.js',
        'js/filedrag.js',
        'js/thumbnail.js',
        'js/vendor/exif.js',
        'js/vendor/smartcrop.js',
        'js/filetypes.js',
        'js/ui/miniui.js',
        'js/ui/export.js',
        'js/ui/dialog.js',
        'js/ui/feedbackDialog.js',
        'js/ui/credentialsWarningDialog.js',
        'js/ui/loginRequiredDialog.js',
        'js/notifyConfig.js',
        'js/notify.js',
        'js/megaNotifications.js',
        'js/vendor/avatar.js',
        'js/vendor/int64.js',
        'js/cms.js',
        'js/keepAlive.js',
        'js/metatags.js',
        'js/utils/trans.js',

        // Transfers
        'js/transfers/meths/filesystem.js',
        'js/transfers/meths/memory.js',
        'js/transfers/meths/cache.js',
        'js/transfers/utils.js',
        'js/transfers/queue.js',
        'js/transfers/downloader.js',
        'js/transfers/download2.js',
        'js/transfers/reader.js',
        'js/transfers/upload2.js',
        'js/transfers/zip64.js',
        'js/transfers/meths.js',
        {pattern: 'aesasm.js', included: false},
        {pattern: 'encrypter.js', included: false},


        // Our chat code.
        'js/chat/strongvelope.js',
        'js/fm/linkinfohelper.js',
        'js/chat/plugins/urlFilter.js',
        'js/chat/plugins/emoticonShortcutsFilter.js',
        'js/chat/plugins/emoticonsFilter.js',
        'js/chat/plugins/backtickRtfFilter.js',
        'js/chat/plugins/rtfFilter.js',
        'js/chat/plugins/chatNotifications.js',
        'js/chat/plugins/callFeedback.js',
        'js/chat/webrtc.js',
        'js/chat/plugins/callManager.js',
        'js/chat/plugins/geoLocationLinks.js',
        'js/chat/messages.js',
        'js/chat/ui/incomingCallDialog.js',
        'js/chat/callNotificationsEngine.js',
        'js/utils/emoji.js',

        {pattern: 'test/chat/transcripts/*.json', included: false},

        // == Test utilities ==
        'test/utilities/fakebroadcaster.js',
        'test/utilities/promises.js',



        // == Tests ==
        // Dependency-based load order of library modules.
        // modules that already follow AMD need included: false
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
        '/': './'
    },

    // Test results reporter to use.
    // Possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'.
    reporters: ['progress', 'coverage', 'junit'],

    // Source files to generate a coverage report for.
    // (Do not include tests or libraries.
    // These files will be instrumented by Istanbul.)
    preprocessors: {
        '*.js': ['coverage'],
        'js/*.js': ['coverage'],
        'js/ui/*.js': ['coverage'],
        'js/utils/*.js': ['coverage'],
        'js/fm/**/*.js': ['coverage'],
        'js/transfers/**/*.js': ['coverage'],
        'html/js/*.js': ['coverage'],
        'js/chat/**/!(bundle)*.js': ['coverage']
    },

    // Coverage configuration
    coverageReporter: {
        type: 'html',
        dir: 'coverage/',
        subdir: function(browser) {
            return String(browser).replace(/[^\w.()]+/g, '_');
        }
    },

    // JUnit reporter configuration.
    junitReporter: {
        outputDir: 'coverage/',
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

    client: {
        mocha: {
            // Increase default timeout of 2000ms
            timeout: 4000
        }
    },

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - ChromeHeadless
    // - Firefox
    // - FirefoxHeadless (Requires version 55+)
    // - FirefoxNightlyHeadless
    // - FirefoxDeveloperHeadless
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    browsers: [
        'Firefox',
        'FirefoxHeadless',
        'Firefox_Extension',
        'Firefox_NoCookies',
        'Firefox_Incognito',
        'Chrome',
        'ChromeHeadless',
        'Chrome_Incognito',
        'Chrome_Unlimited',
        'Chrome_NoCookies'
    ],

    customLaunchers: {
        'Firefox_NoCookies': {
            base: 'FirefoxHeadless',
            displayName: 'Firefox Headless (NoCookies)',
            prefs: {
                'network.cookie.cookieBehavior': 2
            }
        },
        'Firefox_Incognito': {
            base: 'FirefoxHeadless',
            displayName: 'Firefox Headless (PBM)',
            flags: ['-private']
        },
        'Chrome_NoCookies': {
            base: 'ChromeHeadless',
            displayName: 'Chrome Headless (NoCookies)',
            flags: ['--disable-local-storage', '--disable-databases', '--site-per-process']
        },
        'Chrome_Mobile': {
            base: 'Chrome_NoCookies',
            displayName: 'Chrome HeadLess (Mobile)',
            flags: ['--use-mobile-user-agent', '--webview-sandboxed-renderer'],
        },
        'Chrome_Incognito': {
            base: 'ChromeHeadless',
            displayName: 'Chrome Headless (Incognito)',
            flags: ['--incognito']
        },
        'Chrome_Unlimited': {
            base: 'ChromeHeadless',
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
