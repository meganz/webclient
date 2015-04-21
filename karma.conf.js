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
        // Test utilities.
        'node_modules/mocha/mocha.js',
        'node_modules/chai/chai.js',
        'node_modules/karma-chai-plugins/node_modules/sinon-chai/lib/sinon-chai.js',
        'node_modules/sinon/pkg/sinon.js',

        // Basics.
        'js/jquery-2.1.1.js',
        'js/jquery-ui-1.11.2.js',
        'js/jquery.jscrollpane.js',

        // Libraries.
        'js/asmcrypto.js',
        'js/jsbn.js',
        'js/jsbn2.js',
        'js/jodid25519.js',
        
        // Test helpers and test data.
        'test/lang_dummy.js',
        
        // Config
        'test/config.js',

        // Our code.
        'secureboot.js',
        'js/megaPromise.js',
        'js/functions.js',
        'js/mega.js',
        'js/fm.js',
        'js/authring.js',
        'js/crypto.js',
        'js/user.js',
        'js/ui/filepicker.js',
        'js/tlvstore.js',
        
        // Tests.
        {pattern: 'test/fixtures/**/*.html', included: false, served: true},
        {pattern: 'test/**/*_test.js', included: true},
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
