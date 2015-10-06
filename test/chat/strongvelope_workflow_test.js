/**
 * @fileOverview
 * Testing strongvelope within a "workflow". This may increase the execution
 * time significantly.
 */

describe("chat.strongvelope workflow test", function() {
    "use strict";

    var assert = chai.assert;

    var ns = strongvelope;

    // Some test data.
    var ALICE_ED25519_PRIV = atob('4EAniukHl3hvgrRTZDlJYI5NN5ra7M3tmiG6rX0nDgo=');
    var ALICE_ED25519_PUB = atob('mPvHsB15bEXqCKXDqXSfAMd1/dq8ka+h9GY5Qo1UhZI=');
    var ALICE_CU25519_PRIV = atob('ZMB9oRI87iFj5cwKBvgzwnxxToRAO3L5P1gILfJyEik=');
    var ALICE_CU25519_PUB = atob('4BXxF+5ehQKKCCR5x3hP3E0hzYry59jFTM30x9dzWRI=');
    var BOB_ED25519_PRIV = atob('nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A=');
    var BOB_ED25519_PUB = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    var BOB_CU25519_PRIV = atob('dwdtCnMYpX08FsFyUbJmRd9ML4frwJkqsXf7pR25LCo=');
    var BOB_CU25519_PUB = atob('hSDwCYkwp1R0i33ctD73Wg2/Og0mOBr066SpjqqbTmo=');

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    var _echo = function(x) { return x; };
    var _copy = function(source) {
        var __copy = function(dest) {
            for (var i = 0; i < source.length; i++) {
                dest[i] = source.charCodeAt(i);
            }
        };
        return __copy;
    };
    var _bytesOfString = function(x) {
        var result = [];
        for (var i = 0; i < x.length; i++) {
            result.push(x.charCodeAt(i));
        }
        return new Uint8Array(result);
    };

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    if (!window.__SKIP_WORKFLOWS) {
        describe('1-on-1 chat', function() {
            it("normal operation", function() {
                var tests = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                             "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                             'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];

                sandbox.stub(window, 'pubCu25519', { 'alice678900': ALICE_CU25519_PUB,
                                                     'bob45678900': BOB_CU25519_PUB });
                sandbox.stub(window, 'pubEd25519', { 'alice678900': ALICE_ED25519_PUB,
                                                     'bob45678900': BOB_ED25519_PUB });

                var alice = new strongvelope.ProtocolHandler('alice678900',
                                                             ALICE_CU25519_PRIV,
                                                             ALICE_ED25519_PRIV,
                                                             ALICE_ED25519_PUB);
                alice.rotateKeyEvery = 3;
                alice._updateSenderKey();
                var bob = new strongvelope.ProtocolHandler('bob45678900',
                                                           BOB_CU25519_PRIV,
                                                           BOB_ED25519_PRIV,
                                                           BOB_ED25519_PUB);
                bob.rotateKeyEvery = 3;
                bob._updateSenderKey();

                var message;
                var sent;
                var received;

                var start = Date.now();

                for (var i = 0; i < tests.length; i++) {
                    message = tests[i];

                    // Alice encrypts a message to send to Bob.
                    sent = alice.encryptTo(message, 'bob45678900');

                    // Alice receives her own message.
                    received = alice.decryptFrom(sent, 'alice678900');
                    assert.strictEqual(received.payload, message);

                    // Bob receives it.
                    received = bob.decryptFrom(sent, 'alice678900');
                    assert.strictEqual(received.payload, message);

                    // Bob echoes it.
                    sent = bob.encryptTo(received.payload, 'alice678900');

                    // Bob receives hhis own message.
                    received = bob.decryptFrom(sent, 'bob45678900');
                    assert.strictEqual(received.payload, message);

                    // Alice gets it back.
                    received = alice.decryptFrom(sent, 'bob45678900');
                    assert.strictEqual(received.payload, message);
                }

                dump('Total time taken: ' + (Date.now() - start) + ' ms');
                dump('  ' + tests.length + ' messages:'
                     + ' 2 times encrypting/signing each,'
                     + ' 4 times decrypting/verifying each.');
            });
        });
    }
});
