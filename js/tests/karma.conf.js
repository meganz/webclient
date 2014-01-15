module.exports = function(config) {
    config.set({
        frameworks: ['jasmine'],

        files: [
            "vendor/jasmine-2.0.0/jasmine.js",
            "vendor/jasmine-2.0.0/jasmine-html.js",
            "vendor/jasmine-2.0.0/boot.js",

             "../jquery-min-1.8.1.js",
             "vendor/jasmine-jquery.js",
    
             "../functions.js",
             "../vendor/chat/strophe.js",
             "../vendor/chat/strophe.disco.js",
             "../vendor/chat/strophe.jingle.js",
             "../vendor/chat/strophe.jingle.session.js",
             "../vendor/chat/strophe.jingle.sdp.js",
             "../vendor/chat/strophe.jingle.adapter.js",
             "../vendor/chat/strophe.muc.js",
             "../vendor/chat/strophe.roster.js",
             "../vendor/chat/wildemitter.patched.js",
             "../vendor/chat/hark.patched.js",
             "../vendor/chat/salsa20.js",
             "../vendor/chat/bigint.js",
             "../vendor/chat/crypto.js",
             "../vendor/chat/eventemitter.js",
             "../vendor/chat/otr.js",
             "../chat/rtcSession.js",
             "../chat/karere.js",
        ],
        // coverage reporter generates the coverage
        reporters: ['progress', 'coverage'],

        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'src/*.js': ['coverage']
        },

        // optionally, configure the reporter
        coverageReporter: {
            type : 'html',
            dir : 'coverage/'
        }
    });
};