/**
 * @fileOverview
 * Test some transfers-related stuff.
 *
 * XXX: The FileSystemAPI test will prompt for storage permission,
 *      to prevent that use the custom launcher Chrome_Unlimited.
 */

describe("Transfers Unit Test", function() {
    "use strict";

    if (window.__SKIP_WORKFLOWS) {
        return;
    }

    var fsTested = false;
    beforeEach(function(done) {
        localStorage.clear();
        if (!fsTested && window.requestFileSystem) {
            fsTested = true;
            window.requestFileSystem(0, 0x10000,
                function() {
                    ioTests[1].supported = true;
                    done();
                },
                function(e) {
                    if (e && e.code === FileError.SECURITY_ERR) {
                        fsTested = 2;
                    }
                    done();
                }
            );
        }
        else {
            done();
        }
    });


    afterEach(function(done) {
        _hideDebug();
        mStub.restore();
        done();
    });

    var ioTests = [
        {
            method: 'MemoryIO',
            supported: typeof MemoryIO === 'undefined' || MemoryIO.usable()
        },
        {
            method: 'FileSystemAPI',
            supported: false // see beforeEach()
        },
        {
            method: 'CacheIO',
            supported: window.dlMethod
        }
    ];

    var chunkIter = 3;
    var chunkSize = 0x1000000;
    var testIO = function(Method, size, done) {
        var chunk = 0;
        var chunks = size / chunkSize;
        var dl_id = (Math.random() * Date.now()).toString(36);
        var dl = {
                pos: 0,
                id: dl_id,
                name: 'foo-' + dl_id + '.bin',
                size: size,
                writer: {
                    logger: MegaLogger.getLogger(dl_id)
                }
            };
        var io = new Method(dl_id, dl);
        dl.io = io;
        dl.io.size = dl.size;
        io.begin = function() {
            nextChunk();

            function nextChunk() {
                if (chunk === chunks) {
                    // io.abort(true);
                    done();
                } else {
                    var ab = new ArrayBuffer(chunkSize);
                    io.write(new Uint8Array(ab), chunk++ * chunkSize, nextChunk);
                }
            }
        };
        io.setCredentials('https://example.org', dl.size, dl.name);
    };


    it("can save data", function(done) {
        // Extend timeout, this test may take a bit longer.
        this.timeout(this.timeout() * 1.5);

        var tests = ioTests.length;
        var completion = function(step) {
            var count = 0;
            return function() {
                if (++count === chunkIter && !--tests) {
                    done();
                }
            };
        };
        ioTests.forEach(function(io) {
            if (io.supported) {
                assert(typeof window[io.method] !== 'undefined',
                    'DownloadIO Method "' + io.method + '" does not exists.');

                var dlMethod = window[io.method];
                if (typeof dlMethod.init === 'function') {
                    dlMethod.init();
                }
                // console.debug('Testing ' + io.method);

                var next = completion();
                for (var i = 0 ; i < chunkIter ; i++) {
                    testIO(window[io.method], chunkSize << i, next);
                }
            }
            else if (--tests === 0) {
                assert(false, 'No DownloadIO methods supported (!?)');
                done();
            }
        });
    });

    // FIXME: launching workers does fail on Jenkins since Karma 4.1.0
    if (0) it("can encrypt data (uploads)", function(done) {
        _showDebug(['console.info', 'console.error']);

        var gid = (Math.random() * Date.now()).toString(36);
        var file = new Blob([new Array(Math.floor(Math.random() * 4096)).join(gid[4])]);
        file.ul_macs = [];
        file.name = 'foo.bin';
        file.owner = {gid: gid};
        file.ul_key = new Array(6);
        for (var i = 6; i--;) {
            file.ul_key[i] = rand(0x100000000);
        }
        file.ul_keyNonce = JSON.stringify(file.ul_key);
        file.ul_offsets = [{
            byteOffset: 0,
            byteLength: file.size
        }];
        GlobalProgress[gid] = {working: []};

        var chunk = new ChunkUpload(file, 0, file.size);
        chunk.upload = function() {
            expect(console.info.callCount).to.eql(1);
            assert(console.error.callCount === 0, 'Unexpected internal error.');
            done();
        };
        chunk.run();
    });

    it("can generate file fingerprint", function(done) {
        var file = new Blob([new Array(8195).join("0")]);
        file.lastModifiedDate = new Date(1445816183620);
        file.name = 'foo.bin';
        getFingerprint(file).then(function(r) {
            chai.assert.strictEqual(r.hash, 'xUNCAcVDQgHFQ0IBxUNCAQR3Zy1W');
            done();
        });
    });
});
