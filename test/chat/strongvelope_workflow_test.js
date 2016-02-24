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

    var TEST_MESSAGES = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                         "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                         'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
    var RSA_PUB_KEY = [
        asmCrypto.base64_to_bytes('wT+JSBnBNjgalMGT5hmFHd/N5eyncAA+w1TzFC4PYfB'
            + 'nbX1CFcx6E7BuB0SqgxbJw3ZsvvowsjRvuo8SNtfmVIz4fZV45pBPxCkeCWonN/'
            + 'zZZiT3LnYnk1BfnfxfoXtEYRrdVPXAC/VDc9cgy29OXKuuNsREKznb9JFYQUVH9'
            + 'FM='),
        asmCrypto.base64_to_bytes('AQAB')
    ];
    var RSA_PRIV_KEY = [
        asmCrypto.base64_to_bytes('wT+JSBnBNjgalMGT5hmFHd/N5eyncAA+w1TzFC4PYfB'
            + 'nbX1CFcx6E7BuB0SqgxbJw3ZsvvowsjRvuo8SNtfmVIz4fZV45pBPxCkeCWonN/'
            + 'zZZiT3LnYnk1BfnfxfoXtEYRrdVPXAC/VDc9cgy29OXKuuNsREKznb9JFYQUVH9'
            + 'FM='),
        65537,
        asmCrypto.base64_to_bytes('B1SXqop/j8T1DSuCprnVGNsCfnRJra/0sYgpaFyO7NI'
            + 'nujmEJjuJbfHFWrU6GprksGtvmJb4/emLS3Jd6IKsE/wRthTLLMgbzGm5rRZ92g'
            + 'k8XGY3dUrNDsnphFsbIkTVl8n2PX6gdr2hn+rc2zvRupAYkV/smBZX+3pDAcuHo'
            + '+E='),
        asmCrypto.base64_to_bytes('7y+NkdfNlnENazteobZ2K0IU7+Mp59BgmrhBl0TvhiA'
            + '5HkI9WJDIZK67NsDa9QNdJ/NCfmqE/eNkZqFLVq0c+w=='),
        asmCrypto.base64_to_bytes('ztVHfgrLnINsPFTjMmjgZM6M39QEUsi4erg4s2tJiuI'
            + 'v29szH1n2HdPKFRIUPnemj48kANvp5XagAAhOb8u2iQ=='),
        asmCrypto.base64_to_bytes('IniC+aLVUTonye17fOjT7PYQGGZvsqX4VjP51/gqYPU'
            + 'h5jd7qdjr2H7KImD27Vq3wTswuRFW61QrMxNJzUsTow=='),
        asmCrypto.base64_to_bytes('TeoqNGD8sskPTOrta1/2qALnLqo/tq/GTvR255/S5G6'
            + 'weLHqYDUTcckGp0lYNu/73ridZ3VwdvBo9ZorchHbgQ=='),
        asmCrypto.base64_to_bytes('JhqTYTqT5Dj6YoWHWNHbOz24NmMZUXwDms/MDOBM0Nc'
            + '0nX6NjLDooFrJZtBMGMgcSQJd4rULuH94+szNGc2GAg==')
    ];

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

    /**
     * Makes a participant with all required keys for the system.
     *
     * @param {String} handle
     *     User handle of the new participant.
     * @param {Boolean} [rsaKey]
     *     If `true` a (constant) RSA key will be used, and no x25519 key pair
     *     generated (default: false).
     */
    var _makeParticipant = function(handle, rsaKey) {
        if (!window._keyPairs) {
            window._keyPairs = {};
        }

        var dhKeyPair;
        var signKeyPair;
        if (!_keyPairs[handle]) {
            _keyPairs[handle] = {};
            signKeyPair = nacl.sign.keyPair();
            _keyPairs[handle]['Ed25519'] = signKeyPair;
            if (!rsaKey) {
                dhKeyPair = nacl.box.keyPair();
                _keyPairs[handle]['Cu25519'] = dhKeyPair;
            }
        }
        else {
            signKeyPair = _keyPairs[handle]['Ed25519'];
            dhKeyPair = _keyPairs[handle]['Cu25519'];
        }
        var signSecretKey = asmCrypto.bytes_to_string(signKeyPair.secretKey).substring(0, 32);
        var signPublicKey = asmCrypto.bytes_to_string(signKeyPair.publicKey);
        var dhSecretKey;
        var dhPublicKey;
        if (!rsaKey) {
            dhSecretKey = asmCrypto.bytes_to_string(dhKeyPair.secretKey);
            dhPublicKey = asmCrypto.bytes_to_string(dhKeyPair.publicKey);
        }

        var participant = new strongvelope.ProtocolHandler(handle,
                                                           dhSecretKey,
                                                           signSecretKey,
                                                           signPublicKey);
        pubEd25519[handle] = signPublicKey;
        pubCu25519[handle] = dhPublicKey;
        if (rsaKey) {
            u_pubkeys[handle] = RSA_PUB_KEY;
        }

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
                for (var i = 0; i < TEST_MESSAGES.length; i++) {
                    message = TEST_MESSAGES[i];

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
            _messageBuffer.push({ userId: sender, message: sent, ts: Date.now() });

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

            // jshint -W004
            var participants = {};

            var message = '';
            var sent = '';
            var sender = '';
            var result;
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
            message = 'Howdy partners!';
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
            participants['bob45678900'].rotateKeyEvery = 3;
            participants['bob45678900'].totalMessagesBeforeSendKey = 5;
            result = participants['bob45678900'].seed(_messageBuffer);
            assert.strictEqual(result, true);
            sender = 'alice678900';
            message = 'Welcome back, mate.';
            sent = participants[sender].alterParticipants(['bob45678900'], [], message);
            activeParticipants.add('bob45678900');
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Chatty Charlie sends to the group.
            sender = 'charlie8900';
            for (var i = 0; i < TEST_MESSAGES.length; i++) {
                message = TEST_MESSAGES[i];
                sent = participants[sender].encryptTo(message);
                _checkReceivers(sent, sender, message,
                                participants, activeParticipants);
            }

            // Delayed Dave (who doesn't have chat keys, yet) is added.
            // Note: Dave will not respond, but only read new messages.
            participants['dave5678900'] = _makeParticipant('dave5678900', true);
            participants['dave5678900'].updateSenderKey();
            sandbox.stub(window, 'u_privk', RSA_PRIV_KEY);
            sender = 'alice678900';
            message = 'Long time no see, Dave.';
            sent = participants[sender].alterParticipants(['dave5678900'], [], message);
            activeParticipants.add('dave5678900');
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Bob sends to the group.
            sender = 'bob45678900';
            message = 'Welcome back, mate.';
            sent = participants[sender].encryptTo(message);
            _checkReceivers(sent, sender, message,
                            participants, activeParticipants);

            // Dave drops out, and re-initialises (seeds) from history.
            delete participants['dave5678900'];
            participants['dave5678900'] = _makeParticipant('dave5678900', true);
            sandbox.stub(window, 'u_privk', RSA_PRIV_KEY);
            result = participants['dave5678900'].seed(_messageBuffer);
            // Not sent anything, yet, so seed() returns `false`,
            // and we need to update the sender key (initialise).
            assert.strictEqual(result, false);
            participants['dave5678900'].updateSenderKey();

            // jshint +W004
        });


        it("normal operation - as in the UI", function() {
            // Uncomment the following to see log messages produced in the process.
            // sandbox.stub(ns._logger, '_log', console.log);

            // jshint -W004
            var participants = {};

            var message = '';
            var sent = '';
            var sender = '';
            var result;
            var activeParticipants = new Set(['alice678900']);
            participants['alice678900'] = _makeParticipant('alice678900');
            participants['alice678900'].updateSenderKey();

            // Alice starts a chat with Bob.
            participants['bob45678900'] = _makeParticipant('bob45678900');
            participants['bob45678900'].updateSenderKey();


            sent = participants['alice678900'].alterParticipants(['bob45678900'], []);
            activeParticipants.add('charlie8900');
            _checkReceivers(sent, sender, null,
                participants, activeParticipants);

            // jshint +W004
        });
    });
});
