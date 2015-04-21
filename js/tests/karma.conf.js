module.exports = function(config) {
    config.set({
        frameworks: ['mocha'],

        files: [
            "vendor/mocha/mocha.js",
            "vendor/mocha/chai.js",
            "vendor/mocha/sinon-chai.js",
            "vendor/sinon-1.7.3.js",

            "../jquery-2.1.1.js",
            "../jquery-ui-1.11.2.js",

            "src/helpers/fromMega.js",

             "../functions.js",
             "../asmcrypto.js",
             "../jsbn.js",
             "../jsbn2.js",
             "../jodid25519.js",
             "../jquery.jscrollpane.js",
             "../mega.js",
             "../fm.js",
             "../user.js",
             "../megaKvStorage.js",
             "../megaPromise.js",
             "../vendor/db.js",
             "../megaDb.js",
             "../megaNotifications.js",
             "../tlvstore.js",

             "../chat/mpenc.js",
             "../chat/opQueue.js",

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
             "../vendor/chat/base32.js",

             "../vendor/chat/cryptojs-core.js",
             "../vendor/chat/cryptojs-sha1.js",
             "../vendor/chat/cryptojs-hmac.js",
             "../vendor/chat/cryptojs-lib-typedarrays.js",
             "../vendor/Autolinker.js",

             "../chat/fileTransfer.js",
             "../chat/rtcSession.js",

             "../ui/filepicker.js",
             "../chat/ui/incomingCallDialog.js",

             "../chat/plugins/attachmentsFilter.js",
             "../chat/plugins/urlFilter.js",
             "../chat/plugins/emoticonsFilter.js",
             "../chat/plugins/encryptionFilter.js",
             "../chat/plugins/chatStore.js",
             "../chat/plugins/chatNotifications.js",

             "../chat/karereEventObjects.js",
             "../chat/karere.js",
             "../chat/chat.js",
             "../chat/chatRoom.js",

            "src/helpers/functionsMocker.js",
            "src/helpers/megaDataMocker.js",
            "src/helpers/eventMocker.js",
            "src/helpers/fixtures.js",
            "src/helpers/objectMocker.js",
            "src/helpers/karereMocker.js",
            "src/helpers/stropheMocker.js",
            "src/helpers/utils.js",
             "../tests/src/unit/*.js",
//             "../tests/src/integration/*.js",

            { pattern: 'src/unit/fixtures/**/*.html', included: false, served: true }

        ],
        // coverage reporter generates the coverage
        reporters: ['progress', 'coverage'],

        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            '../chat/!(*mpenc|rtcSession).js': ['coverage'],
            '../megakvstorage.js': ['coverage'],
             '../tlvstore.js': ['coverage']
        },

//        browsers: ['PhantomJS_custom'],

        // you can define custom flags
        customLaunchers: {
            'PhantomJS_custom': {
                base: 'PhantomJS',
                options: {
                    windowName: 'my-window',
                    settings: {
                        webSecurityEnabled: false
                    }
                },
                flags: [
                    '--web-security=false',
                    '--local-to-remote-url-access=true'
                ]
            }
        },

        // optionally, configure the reporter
        coverageReporter: {
            type : 'html',
            dir : 'coverage/'
        },
        client: {
            mocha: {
                ui: 'bdd'
            }
        }
    });
};
