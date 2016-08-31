
/**
 * @fileOverview
 * Chat message transcript tests.
 */

describe("chat.strongvelope transcripts unit test", function() {
    "use strict";

    var assert = chai.assert;
    var AssertionError = chai.AssertionError;

    var sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    var expected = function(expected, got, msg) {
        if (expected !== got) {
            var errorMsg = "Expected: " + expected + "\nGot: " + got + "\nError message: " + msg;
            assert.fail(expected, got, errorMsg);
        }
    };

    var compareMsg = function(expectedMsg, decryptedMsg) {
        ['sender', 'type', 'payload'].forEach(function(k) {
            if (expectedMsg[k] !== decryptedMsg[k]) {
                expected(
                    expectedMsg[k], decryptedMsg[k],
                    'Decryption result mismatch for property ' + k
                );
            }
        });

        ['includeParticipants', 'excludeParticipants', 'payload'].forEach(function(k) {
            if (JSON.stringify(expectedMsg[k]) !== JSON.stringify(decryptedMsg[k])) {
                expected(
                    JSON.stringify(expectedMsg[k]), JSON.stringify(decryptedMsg[k]),
                    'Decryption result mismatch for property ' + k
                );
            }
        });
    };

    var testTranscript = function(name, before, after) {
        it("transcript - " + name, function(done) {
            if (before) {
                before();
            }

            var finish = function() {
                if (after) {
                    after(done);
                }
                else {
                    done();
                }
            };


            $.get('test/chat/transcripts/' + name + '.json')
                .done(function(r) {
                    assert(r, 'transcript is invalid.');

                    // setup globals
                    [
                        'u_handle',
                        'u_privCu25519',
                        'u_privEd25519',
                        'u_pubEd25519',
                        'u_privk',
                        'u_pubkeys',
                        'pubEd25519',
                        'pubCu25519'
                    ].forEach(function(k) {
                        sandbox.stub(window, k, r[k]);
                    });

                    var protocolHandler = new strongvelope.ProtocolHandler(
                        r.u_handle,
                        r.u_privCu25519,
                        r.u_privEd25519,
                        r.u_pubEd25519
                    );

                    var hist = [];
                    var expandedHist = [];

                    r.functionCallLog.forEach(function(callMeta, k) {
                        if (callMeta.contextName === "strongvelope.ProtocolHandler.prototype.seed") {
                            // seed messages testing
                            try {
                                var seedResult = protocolHandler.seed(callMeta.arguments[0]);
                                if (seedResult !== callMeta.result) {
                                    expected(
                                        callMeta.result, seedResult,
                                        '.seed(...) returned unexpected value during call #' + k
                                    );
                                }
                            } catch (e) {
                                if (!(e instanceof AssertionError)) {
                                    expected(
                                        false, false,
                                        'seed(...) failed, in call #' + k + ' ' +
                                        'because of uncaught exception...' + e + e.stack
                                    );
                                }
                                else {
                                        throw e;
                                }
                            }
                        }
                        else if (callMeta.contextName === "strongvelope.ProtocolHandler.prototype.decryptFrom") {
                            // decryptFrom messages testing
                            try {
                                var decryptResult = protocolHandler.decryptFrom(
                                    callMeta.arguments[0],
                                    callMeta.arguments[1],
                                    callMeta.arguments[2]
                                );
                                compareMsg(callMeta.result, decryptResult);
                            } catch (e) {
                                if (!(e instanceof AssertionError)) {
                                    expected(
                                        false, false,
                                        'decryptFrom(...) failed, in call #' + k + ' ' +
                                        'because of uncaught exception...' + e + e.stack
                                    );
                                }
                                else {
                                    throw e;
                                }
                            }
                        }
                        else if (callMeta.contextName === "strongvelope.ProtocolHandler.prototype.encryptTo") {
                            // encryptTo messages testing
                            try {
                                var encryptResult = protocolHandler.encryptTo(
                                    callMeta.arguments[0],
                                    callMeta.arguments[1]
                                );

                                // try to decrypt it, by myself!
                                [
                                    callMeta.result,
                                    encryptResult
                                ].forEach(function(encryptedMessage, msgNum) {
                                    var decryptResult = protocolHandler.decryptFrom(encryptedMessage, window.u_handle);

                                    expected(
                                        base64urlencode(callMeta.arguments[0]),
                                        base64urlencode(decryptResult.payload),
                                        'encryptTo(...) failed, in call #' + k + ', ' + (
                                            msgNum === 0 ? '(message from transcript)' : '(just encrypted message)'
                                        )
                                    );
                                });

                            } catch (e) {
                                if (!(e instanceof AssertionError)) {
                                    expected(
                                        false, false,
                                        'encryptTo(...) failed, in call #' + k + ' ' +
                                        'because of uncaught exception...' + e + e.stack
                                    );
                                }
                                else {
                                    throw e;
                                }
                            }
                        }
                    });


                    finish();
                })
                .fail(function(r) {
                    assert(false, 'transcript could not be loaded.');
                });
        });
    };

    //testTranscript("basic_test_loaded_32_history");
    //testTranscript("basic_test_loaded_32_history_and_sent_1_message");
    //testTranscript("basic_test_loaded_32_history_and_sent_1_message_and_scrolled");
    //testTranscript("real_chat_session_from_january");
    testTranscript("legacy_messages");
    testTranscript("legacy_messages_2");
});
