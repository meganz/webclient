// Karma configuration.

module.exports = function(config) {
  config.set({
    // Base path, that will be used to resolve files and exclude.
    basePath: '',

    // Frameworks to use.
    frameworks: ['requirejs', 'mocha', 'chai', 'sinon'],

    // List of files/patterns to load in the browser.
    // {included: false} files are loaded by requirejs
    files: [
        // Dependency-based load order of library modules.
        // (currently empty)

        // Ours.
        'js/config.js',
        {pattern: 'src/**/*.js', included: false},
        'test/test_data.js',
        'test/test_utils.js',
        {pattern: 'test/**/*_test.js', included: false},
        'test/test_main.js',
    ],

    // List of files to exclude.
    exclude: [
    ],

    // Test results reporter to use.
    // Possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'.
    reporters: ['progress', 'coverage'],

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
