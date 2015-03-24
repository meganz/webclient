function FlashIO(dl_id, dl) {
    var IO = this,
        swfid, offset = 0,
        retries = 0

    if (dl.zip_dl_id) {
        dl_id = dl.zip_dl_id;
    }
    swfid = 'dlswf_' + (dl.zipid ? 'zip_' + dl.zipid : dl_id)

    this.write = function(buffer, position, done) {
        var node = document.getElementById(swfid);
        if (typeof node.flashdata !== 'function') {
            return setTimeout(function() {
                if (!dl.cancelled) {
                    if (++retries < 100) {
                        IO.write(buffer, position, done);
                    }
                    else {
                        dlFatalError(dl, 'FlashIO error -- Do you have Adobe Flash installed?');
                    }
                }
            }, 300);
        }
        var j, k, len, subdata;

        if (have_ab) {
            len = buffer.length;
        }
        else {
            len = buffer.buffer.length;
        }

        if (d) {
            console.log('FlashIO', len, offset);
        }
        if (d) {
            console.time('flash-io');
        }

        if (have_ab) {
            subdata = ab_to_base64(buffer);
        }
        else {
            subdata = base64urlencode(buffer.buffer);
        }

        node.flashdata(dl_id, subdata);
        if (d) {
            console.timeEnd('flash-io');
        }

        offset += len;
        Later(done);
    };

    this.download = function(name, path) {
        document.getElementById(swfid).flashdata(dl_id, '', name);
    };

    this.setCredentials = function(url, size, filename, chunks, sizes) {
        // dl_geturl = url;
        // dl_filesize = size;
        // dl_filename = filename;
        // dl_chunks   = chunks;
        // dl_chunksizes = sizes;
        if (size > 950 * 0x100000) {
            dlFatalError(dl, Error('File too big to be reliably handled with Flash.'));
            if (!this.is_zip) {
                ASSERT(!this.begin, "This should have been destroyed 'while initializing'");
            }
        }
        else {
            IO.begin();
        }
    };
}
FlashIO.warn = true;
