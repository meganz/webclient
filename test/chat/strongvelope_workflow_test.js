/**
 * @fileOverview
 * Testing strongvelope within a "workflow". This may increase the execution
 * time significantly.
 */

describe("chat.strongvelope workflow test", function() {
    "use strict";

    if (window.__SKIP_WORKFLOWS) {
        return;
    }

    var assert = chai.assert;

    var ns = strongvelope;

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

    var _makeParticipant = function(handle) {
        if (!window._keyPairs) {
            window._keyPairs = {};
        }

        var dhKeyPair;
        var signKeyPair;
        if (!_keyPairs[handle]) {
            _keyPairs[handle] = {};
            dhKeyPair = nacl.box.keyPair();
            _keyPairs[handle]['Cu25519'] = dhKeyPair;
            signKeyPair = nacl.sign.keyPair();
            _keyPairs[handle]['Ed25519'] = signKeyPair;
        }
        else {
            dhKeyPair = _keyPairs[handle]['Cu25519'];
            signKeyPair = _keyPairs[handle]['Ed25519'];
        }
        var dhSecretKey = asmCrypto.bytes_to_string(dhKeyPair.secretKey);
        var dhPublicKey = asmCrypto.bytes_to_string(dhKeyPair.publicKey);
        var signSecretKey = asmCrypto.bytes_to_string(signKeyPair.secretKey).substring(0, 32);
        var signPublicKey = asmCrypto.bytes_to_string(signKeyPair.publicKey);

        var participant = new strongvelope.ProtocolHandler(handle,
                                                           dhSecretKey,
                                                           signSecretKey,
                                                           signPublicKey);
        pubCu25519[handle] = dhPublicKey;
        pubEd25519[handle] = signPublicKey;

        return participant;
    };

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('1-on-1 chat', function() {
        it("normal operation", function() {
            var tests = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                         "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                         'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];

            sandbox.stub(window, 'pubCu25519', {});
            sandbox.stub(window, 'pubEd25519', {});

            var alice = _makeParticipant('alice678900');
            alice.rotateKeyEvery = 5;
            alice.totalMessagesBeforeSendKey = 10;
            alice.updateSenderKey();
            var bob = _makeParticipant('bob45678900');
            bob.rotateKeyEvery = 10;
            bob.totalMessagesBeforeSendKey = 5;
            bob.updateSenderKey();

            var message;
            var sent;
            var received;
            var toSendReceived;

            var start = Date.now();
            var messagesProcessedAlice = 0;

            while (messagesProcessedAlice < 50) {
                for (var i = 0; i < tests.length; i++) {
                    message = tests[i];

                    // Alice encrypts a message to send to Bob.
                    sent = alice.encryptTo(message, 'bob45678900');
                    messagesProcessedAlice++;

                    // Alice receives her own message.
                    received = alice.decryptFrom(sent, 'alice678900');
                    assert.strictEqual(received.payload, message);

                    // Bob receives it.
                    received = bob.decryptFrom(sent, 'alice678900');
                    assert.strictEqual(received.payload, message);
                    if (typeof received.toSend !== 'undefined') {
                        // See if Alice can handle the key re-send.
                        toSendReceived = alice.decryptFrom(received.toSend, 'bob45678900');
                        assert.strictEqual(toSendReceived.payload, null);
                        // See if Bob can handle his own key re-send.
                        toSendReceived = bob.decryptFrom(received.toSend, 'bob45678900');
                        assert.strictEqual(toSendReceived.payload, null);
                    }

                    // Bob echoes it.
                    sent = bob.encryptTo(received.payload, 'alice678900');

                    // Bob receives his own message.
                    received = bob.decryptFrom(sent, 'bob45678900');
                    assert.strictEqual(received.payload, message);

                    // Alice gets it back.
                    received = alice.decryptFrom(sent, 'bob45678900');
                    assert.strictEqual(received.payload, message);
                    messagesProcessedAlice++;
                    if (typeof received.toSend !== 'undefined') {
                        // See if Bob can handle the key re-send.
                        toSendReceived = bob.decryptFrom(received.toSend, 'alice678900');
                        assert.strictEqual(toSendReceived.payload, null);
                        // See if Alice can handle her own key re-send.
                        toSendReceived = alice.decryptFrom(received.toSend, 'alice678900');
                        assert.strictEqual(toSendReceived.payload, null);
                    }
                }
            }

            dump('Total time taken: ' + (Date.now() - start) + ' ms');
            dump('  ' + messagesProcessedAlice
                 + ' messages between two participants'
                 + ' (incl. signing/verifying, key reminders, key refreshs).');
        });
    });

    describe('group chat', function() {
        var _checkReceivers = function(sent, sender, message,
                participants, activeParticipants) {
            if (!window._messageBuffer) {
                window._messageBuffer = [];
            }
            _messageBuffer.push({ userId: sender, message: sent });

            var received;
            var toSend = [];
            for (var handle in participants) {
                if (participants.hasOwnProperty(handle)) {
                    var person = participants[handle];
                    received = person.decryptFrom(sent, sender);
                    if (activeParticipants.has(person.ownHandle)) {
                        assert.strictEqual(received.payload, message);
                        if (sender !== person.ownHandle) {
                            assert.ok(person.otherParticipants.has(sender));
                        }
                    }
                    else {
                        assert.strictEqual(received, false);
                        assert.strictEqual(person.otherParticipants.size, 0);
                    }

                    if (received.toSend) {
                        toSend.push([received.toSend, person.ownHandle]);
                    }
                }
            }

            // Process potential reminder message.
            for (var i = 0; i < toSend.length; i++) {
                _checkReceivers(toSend[i][0], toSend[i][1], null,
                                participants, activeParticipants);
            }
        };

        it("normal operation", function() {
            // Uncomment the following to see log messages produced in the process.
            // sandbox.stub(ns._logger, '_log', console.log);

            var participants = {};

            var message = '';
            var sent = '';
            var sender = '';
            var received = {};
            var activeParticipants = new Set(['alice678900']);
            participants['alice678900'] = _makeParticipant('alice678900');
            participants['alice678900'].updateSenderKey();

            // Alice starts a chat with Bob.
            participants['bob45678900'] = _makeParticipant('bob45678900');
            participants['bob45678900'].updateSenderKey();
            sender = 'alice678900';
            message = 'Tēnā koe';
            sent = participants[sender].encryptTo(message, 'bob45678900');
            activeParticipants.add('bob45678900');
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Bob replies.
            sender = 'bob45678900';
            message = 'Kia ora';
            sent = participants[sender].encryptTo(message);
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Alice adds Charlie to the chat.
            participants['charlie8900'] = _makeParticipant('charlie8900');
            participants['charlie8900'].updateSenderKey();
            sender = 'alice678900';
            sent = participants[sender].alterParticipants(['charlie8900'], []);
            activeParticipants.add('charlie8900');
            _checkReceivers(sent, sender, null,
                            participants, activeParticipants);

            // Bob sends to the group.
            sender = 'bob45678900';
            message = 'Good to see you, bro.';
            sent = participants[sender].encryptTo(message);
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Alice removes Bob from the chat.
            sender = 'alice678900';
            sent = participants[sender].alterParticipants([], ['bob45678900']);
            activeParticipants.delete('bob45678900');
            _checkReceivers(sent, sender, null,
                            participants, activeParticipants);

            // Charlie sends to the group.
            sender = 'charlie8900';
            message = 'Howdy partmers!';
            sent = participants[sender].encryptTo(message);
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Let's remove Bob's handler, and send another message.
            delete participants['bob45678900'];
            sender = 'alice678900';
            message = "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn";
            sent = participants[sender].encryptTo(message);
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Bob re-joins (Bob is now a nervous key rotator).
            participants['bob45678900'] = _makeParticipant('bob45678900');
            participants['bob45678900'].rotateKeyEvery = 2;
            participants['bob45678900'].totalMessagesBeforeSendKey = 4;
            participants['bob45678900'].seed(_messageBuffer);
            sender = 'alice678900';
            message = 'Welcome back, mate.';
            sent = participants[sender].alterParticipants(['bob45678900'], [], message);
            activeParticipants.add('bob45678900');
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Chatty Charlie sends to the group.
            sender = 'charlie8900';
            var messages = ['42', "Don't panic!", 'Flying Spaghetti Monster',
                            "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                            'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
            for (var i = 0; i < messages.length; i++) {
                message = messages[i];
                sent = participants[sender].encryptTo(message);
                _checkReceivers(sent, sender, message,
                                participants, activeParticipants);
            }
        });
    });
});
