/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2026 by Mega Limited, Auckland, New Zealand
 * All rights reserved.
 *
 * This licence grants you the rights, and only the rights, set out below,
 * to access and review Mega's code. If you take advantage of these rights,
 * you accept this licence. If you do not accept the licence,
 * do not access the code.
 *
 * Words used in the Mega Limited Terms of Service [https://mega.nz/terms]
 * have the same meaning in this licence. Where there is any inconsistency
 * between this licence and those Terms of Service, these terms prevail.
 *
 * 1. This licence does not grant you any rights to use Mega's name, logo,
 *    or trademarks and you must not in any way indicate you are authorised
 *    to speak on behalf of Mega.
 *
 * 2. If you issue proceedings in any jurisdiction against Mega because you
 *    consider Mega has infringed copyright or any patent right in respect
 *    of the code (including any joinder or counterclaim), your licence to
 *    the code is automatically terminated.
 *
 * 3. THE CODE IS MADE AVAILABLE "AS-IS" AND WITHOUT ANY EXPRESS OF IMPLIED
 *    GUARANTEES AS TO FITNESS, MERCHANTABILITY, NON-INFRINGEMENT OR OTHERWISE.
 *    IT IS NOT BEING PROVIDED IN TRADE BUT ON A VOLUNTARY BASIS ON OUR PART
 *    AND YOURS AND IS NOT MADE AVAILABLE FOR CONSUMER USE OR ANY OTHER USE
 *    OUTSIDE THE TERMS OF THIS LICENCE. ANYONE ACCESSING THE CODE SHOULD HAVE
 *    THE REQUISITE EXPERTISE TO SECURE THEIR OWN SYSTEM AND DEVICES AND TO
 *    ACCESS AND USE THE CODE FOR REVIEW PURPOSES. YOU BEAR THE RISK OF
 *    ACCESSING AND USING IT. IN PARTICULAR, MEGA BEARS NO LIABILITY FOR ANY
 *    INTERFERENCE WITH OR ADVERSE EFFECT ON YOUR SYSTEM OR DEVICES AS A
 *    RESULT OF YOUR ACCESSING AND USING THE CODE.
 *
 * Read the full and most up-to-date version at:
 *    https://github.com/meganz/webclient/blob/master/LICENCE.md
 *
 * ***************** END MEGA LIMITED CODE REVIEW LICENCE ***************** */

/**
 * @file ZIP archive browser - present .zip files in MEGA as read-only folder views.
 *
 * Reads the central directory of a .zip stored in MEGA without downloading the
 * whole file: fetches the last ~64KB to locate the End-of-Central-Directory
 * (EOCD) record, then a second range fetch for the central directory itself.
 * Supports ZIP64. Decryption of the encrypted MEGA file bytes is done locally
 * via the WebCrypto SubtleCrypto AES-CTR primitive.
 * Supports .tar and .gz
 *
 * No fake nodes are added to M.d / M.c. Navigation uses HTML5 history state, so
 * the browser back / forward buttons step through in-archive paths and finally
 * close the view. The FM render pipeline is untouched; we mount an overlay
 * inside .fm-right-files-block while a zip is open and remove it on close.
 *
 * Public surface (mega.zipBrowser):
 *     openArchive(node)   Open a .zip/.tar/.gz node. Returns Promise<Boolean>.
 *     close()             Tear down the zip view and restore the FM.
 *     navigateTo(path)    Navigate to a sub-path inside the open archive.
 *
 * MEGA LIMITED - Internal development.
 */
// Lazy-instantiated via the standard MEGA pattern (mega.zipBrowser); the class is built
// only on first use.
lazy(mega, 'zipBrowser', () => {
    'use strict';

    // The max EOCD region is: 22 (fixed EOCD) + 65535 (max comment) = 65557.
    // ZIP64 locator (if present) is 20 bytes immediately preceding the EOCD.
    // Round up to 66000 to comfortably catch both with one read.
    const TAIL_BUFFER_SIZE = 66000;

    // Signatures (little-endian, the leading "PK\x05\x06" etc.).
    const SIG_EOCD     = 0x06054B50;
    const SIG_EOCD64   = 0x06064B50;
    const SIG_LOC64    = 0x07064B50;
    const SIG_CD_ENTRY = 0x02014B50;

    // Header IDs of extra fields we care about.
    const ZIP64_EXTRA_ID = 0x0001;

    // General-purpose bit flags (central-directory entry, offset +8).
    const GPFLAG_ENCRYPTED        = 0x0001;   // bit 0: entry data is encrypted
    const GPFLAG_STRONG_ENCRYPTED = 0x2000;   // bit 13: strong encryption (central dir may be encrypted)

    // Local file header: fixed portion size and signature.
    const LOCAL_HEADER_SIZE = 30;
    const SIG_LOCAL_HEADER  = 0x04034B50;

    // Compression methods we can extract.
    const METHOD_STORED  = 0;
    const METHOD_DEFLATE = 8;

    // Plaintext read chunk for streaming extraction (bytes).
    const DOWNLOAD_CHUNK = 4 * 1024 * 1024;

    // Max size we will buffer in memory when the File System Access API is not
    // available (no true streaming-to-disk). Above this we refuse and ask the
    // user to use a browser that supports streaming saves.
    const DOWNLOAD_BUFFER_CAP = 512 * 1024 * 1024;

    // Monotonic counter to make each synthetic TPW download transfer id unique.
    let downloadSeq = 0;

    // Single reusable UTF-8 decoder (TextDecoder instances are reusable; used in hot loops).
    const utf8Decoder = new TextDecoder('utf-8', {fatal: false});

    // Display glyphs built from char codes to keep this source file ASCII-only.
    const CRUMB_SEP = ` ${String.fromCharCode(0x203A)} `;   // ' > ' breadcrumb separator
    const EMPTY_CELL = String.fromCharCode(0x2014);         // em-dash placeholder for empty cells

    // Styling lives in css/zipbrowser.css (registered in secureboot.js).

    /**
     * ZipBrowser - single-class implementation for the entire feature.
     */
    return new class ZipBrowser {

        constructor() {
            /**
             * The active session, or null if no zip is open.
             * @type {?{node: Object, format: String, dlData: Object,
             *         entries: Array, tree: Object, path: String,
             *         container: HTMLElement, onPopState: Function, pageChangeListener: String}}
             */
            this.active = null;
        }

        // ---------------------------------------------------------------------
        // Public API
        // ---------------------------------------------------------------------

        /**
         * Decide whether a node is an archive we can open, and which format.
         * @param {Object} node MEGA file node
         * @returns {('zip'|'tar'|'gz'|false)} the format, or false
         */
        canOpen(node) {
            // gz and DEFLATE-zip entries decompress with DecompressionStream, which is native
            // and NOT polyfilled - don't offer the feature where it isn't available.
            if (!self.DecompressionStream) {
                return false;
            }
            if (typeof node === 'string') {
                node = M.getNodeByHandle(node);
            }
            if (!node || node.t || !node.s || typeof node.name !== 'string') {
                return false;
            }
            const name = node.name.toLowerCase();
            if (name.endsWith('.zip')) {
                return 'zip';
            }
            if (name.endsWith('.tar')) {
                return 'tar';
            }
            // Plain gzip only - a .tar.gz/.tgz would need whole-file decompression
            // just to list, which we deliberately don't support.
            if (name.endsWith('.gz') && !name.endsWith('.tar.gz')) {
                return 'gz';
            }
            return false;
        }

        /**
         * Open an archive file node (.zip/.tar/.gz) as a read-only folder view.
         * @param {Object} node MEGA file node (must have a decrypted key in node.k)
         * @returns {Promise<Boolean>} true on success, false on failure
         */
        async openArchive(node) {
            if (typeof node === 'string') {
                node = M.getNodeByHandle(node);
            }
            const format = this.canOpen(node);
            if (!format) {
                if (d) {
                    console.info('[zipBrowser] openArchive(): not a supported archive node', node);
                }
                return false;
            }
            eventlog(501257);   // archive opened in the zip browser
            if (this.active) {
                this.close();
            }

            // Mount the overlay immediately so the user sees feedback while we fetch.
            this._mount(node, format);
            this._renderStatus(l.zip_reading_archive);

            // Promise chain (no try/catch): worker reads + renders (resolving to a
            // boolean), the catch surfaces a localized message.
            return this._loadArchive(node)
                .catch((ex) => {
                    if (d) {
                        console.warn('[zipBrowser] openArchive() failed:', ex);
                    }
                    // Friendly errors carry a localized, user-ready message; any
                    // other (technical) failure shows a generic localized one -
                    // the raw detail is already in the console.warn above.
                    const msg = ex && ex.zipFriendly ? ex.message : l.zip_read_error;
                    this._renderStatus(msg);
                    return false;
                });
        }

        /**
         * Fetch the key + entry list and render. Throws on failure (the caller's
         * .catch() surfaces it) - no try/catch here.
         */
        async _loadArchive(node) {
            const dlData = await this._getTicket(node);
            const ctx = {node, format: this.active.format, dlData};

            const {entries, tree} = await this._readArchive(ctx);

            this.active.dlData = dlData;
            this.active.entries = entries;
            this.active.tree = tree;
            this.active.path = '';
            return this._render();
        }

        /**
         * Close the zip view and let the FM resume.
         */
        close() {
            if (!this.active) {
                return;
            }
            if (this.active.onPopState) {
                window.removeEventListener('popstate', this.active.onPopState);
            }
            if (this.active.pageChangeListener) {
                mBroadcaster.removeListener(this.active.pageChangeListener);
            }
            if (this.active.container && this.active.container.parentNode) {
                this.active.container.parentNode.removeChild(this.active.container);
            }
            if (this.active.host) {
                this.active.host.classList.remove('zip-browser-open');
            }
            this.active = null;
        }

        /**
         * Navigate to a sub-path inside the open archive.
         * @param {String} path Slash-separated path inside the zip ('' = root)
         */
        navigateTo(path) {
            if (!this.active) {
                return;
            }
            this.active.path = path || '';
            pushHistoryState(page, {zipBrowser: {handle: this.active.node.h, path: this.active.path}});
            this._render();
        }

        /**
         * Close the viewer and return to the FM folder that holds the .zip.
         * The FM underneath is already at that folder (we only overlaid it), so
         * a plain close() reveals it - no history unwinding needed.
         */
        _closeToParent() {
            this.close();
        }

        // ---------------------------------------------------------------------
        // Archive reading
        // ---------------------------------------------------------------------

        /**
         * Read the archive's entry list, dispatching by detected format.
         * @returns {Promise<{entries: Array, tree: Object}>}
         */
        _readArchive(ctx) {
            switch (this.active.format) {
                case 'tar':
                    return this._readTarArchive(ctx);
                case 'gz':
                    return this._readGzArchive(ctx);
                default:
                    return this._readZipArchive(ctx);
            }
        }

        async _readZipArchive(ctx) {
            const fileSize = ctx.node.s;
            const tailLen = Math.min(TAIL_BUFFER_SIZE, fileSize);
            const tailOffset = fileSize - tailLen;
            const tailBytes = await this._fetchRange(ctx, tailOffset, tailLen);

            const eocdOffInBuf = this._findEOCD(tailBytes);
            if (eocdOffInBuf < 0) {
                throw new Error('Not a valid ZIP archive (EOCD not found).');
            }

            const eocd = this._parseEOCD(tailBytes, eocdOffInBuf);
            let cdInfo = eocd;
            if (eocd.isZip64) {
                cdInfo = await this._readZip64Eocd(ctx, tailBytes, eocdOffInBuf);
            }

            if (!cdInfo.cdSize) {
                throw new Error('Archive central directory is empty or unreadable.');
            }

            const cdBytes = await this._fetchRange(ctx, cdInfo.cdOffset, cdInfo.cdSize);
            const entries = this._parseCentralDirectory(cdBytes);

            // If the EOCD claims entries but we parsed none, the central directory
            // is most likely encrypted (PKWARE strong encryption / "masked" mode)
            // or otherwise unreadable. Surface a clear, friendly message.
            if (!entries.length && cdInfo.totalEntries > 0) {
                const err = new Error(l.zip_dir_encrypted);
                err.zipFriendly = true;
                throw err;
            }
            if (entries.some((e) => e.isStrongEncrypted)) {
                const err = new Error(l.zip_strong_encryption);
                err.zipFriendly = true;
                throw err;
            }

            const tree = this._buildTree(entries);
            return {entries, tree};
        }

        // ---------------------------------------------------------------------
        // TAR reading
        // ---------------------------------------------------------------------

        /**
         * List a (uncompressed) TAR archive by walking its 512-byte headers from
         * the start. Handles ustar (name + prefix), PAX extended headers
         * (typeflag 'x' -> path/size/mtime), and GNU long names (typeflag 'L').
         * @returns {Promise<{entries: Array, tree: Object}>}
         */
        async _readTarArchive(ctx) {
            const BLOCK = 512;
            const total = ctx.node.s;
            const entries = [];

            // Pending overrides from a preceding PAX 'x' / GNU 'L' meta entry.
            const ov = {path: null, size: null, mtime: null, gnuName: null};

            let offset = 0;
            let zeroBlocks = 0;

            while (offset + BLOCK <= total) {
                const hdr = await this._fetchRange(ctx, offset, BLOCK);

                if (this._isZeroBlock(hdr)) {
                    // Two consecutive zero blocks mark the end of the archive.
                    if (++zeroBlocks >= 2) {
                        break;
                    }
                    offset += BLOCK;
                    continue;
                }
                zeroBlocks = 0;

                const typeflag = String.fromCharCode(hdr[156] || 0);
                const size = this._tarSize(hdr, ov.size);
                const dataBlocks = Math.ceil(size / BLOCK) * BLOCK;

                // Meta records (PAX x/g, GNU L) describe the NEXT entry: read their
                // payload into `ov` and skip to the following header.
                if (typeflag === 'x' || typeflag === 'g' || typeflag === 'L') {
                    await this._readTarMeta(ctx, typeflag, offset + BLOCK, size, ov);
                    offset += BLOCK + dataBlocks;
                    continue;
                }

                const entry = this._tarEntry(hdr, typeflag, size, offset + BLOCK, ov);
                if (entry) {
                    entries.push(entry);
                }

                // Clear one-shot overrides.
                ov.path = ov.size = ov.mtime = ov.gnuName = null;

                const next = offset + BLOCK + dataBlocks;
                if (next <= offset) {
                    // Defensive: never go backwards / stall on a malformed header.
                    break;
                }
                offset = next;
            }

            const tree = this._buildTree(entries);
            return {entries, tree};
        }

        /**
         * Read a PAX ('x'/'g') or GNU long-name ('L') meta record payload into `ov`,
         * overriding the next entry's name/size/mtime. ('g' is read but not applied.)
         */
        async _readTarMeta(ctx, typeflag, dataOffset, size, ov) {
            const buf = await this._fetchRange(ctx, dataOffset, size);
            if (typeflag === 'L') {
                ov.gnuName = this._cstr(buf, 0, buf.length);
                return;
            }
            if (typeflag === 'x') {
                const pax = this._parsePax(buf);
                if (pax.path !== undefined) {
                    ov.path = pax.path;
                }
                if (pax.size !== undefined) {
                    ov.size = parseInt(pax.size, 10);
                }
                if (pax.mtime !== undefined) {
                    ov.mtime = Math.floor(parseFloat(pax.mtime));
                }
            }
        }

        /**
         * Build a normalized entry from a tar header (applying pending `ov` overrides),
         * or null for records we skip (hardlink '1' / symlink '2' / nameless).
         * Name precedence: PAX path > GNU long name > ustar prefix+name.
         */
        _tarEntry(hdr, typeflag, size, dataOffset, ov) {
            const rawName = this._cstr(hdr, 0, 100);
            const prefix = this._cstr(hdr, 345, 155);
            const mtime = ov.mtime === null ? this._tarOctal(hdr, 136, 12) : ov.mtime;

            let name = ov.path || ov.gnuName || (prefix ? `${prefix}/${rawName}` : rawName);
            name = name.replace(/\/+$/, '');

            if (!name || typeflag === '1' || typeflag === '2') {
                return null;
            }
            const isDir = typeflag === '5' || (ov.path === null && ov.gnuName === null && rawName.endsWith('/'));
            const isFile = typeflag === '0' || typeflag === '\0' || typeflag === '';

            return {
                name,
                isDir,
                isFile: isFile && !isDir,
                size: isDir ? 0 : size,
                mtime,
                dataOffset,
                isEncrypted: false,
                isStrongEncrypted: false
            };
        }

        _isZeroBlock(buf) {
            for (let i = 0; i < buf.length; i++) {
                if (buf[i] !== 0) {
                    return false;
                }
            }
            return true;
        }

        /** Read a NUL-terminated string from a byte range (UTF-8, tolerant). */
        _cstr(buf, start, len) {
            let end = start;
            const limit = Math.min(start + len, buf.length);
            while (end < limit && buf[end] !== 0) {
                end++;
            }
            return utf8Decoder.decode(buf.subarray(start, end));
        }

        /** Parse a tar octal numeric field. */
        _tarOctal(buf, start, len) {
            const s = this._cstr(buf, start, len).trim();
            const n = parseInt(s, 8);
            return Number.isFinite(n) ? n : 0;
        }

        /** Tar size field: PAX override, else base-256 (GNU) or octal. */
        _tarSize(buf, paxSize) {
            if (paxSize !== null && Number.isFinite(paxSize)) {
                return paxSize;
            }
            // GNU base-256 encoding: high bit of the first byte is set.
            if (buf[124] & 0x80) {
                let n = buf[124] & 0x7f;
                for (let i = 125; i < 136; i++) {
                    n = n * 256 + buf[i];
                }
                return n;
            }
            return this._tarOctal(buf, 124, 12);
        }

        /**
         * Parse PAX extended-header records ("<len> <key>=<value>\n").
         * @returns {Object} map of key -> value (strings)
         */
        _parsePax(buf) {
            const text = utf8Decoder.decode(buf);
            const out = Object.create(null);
            let i = 0;
            while (i < text.length) {
                const sp = text.indexOf(' ', i);
                if (sp < 0) {
                    break;
                }
                const recLen = parseInt(text.slice(i, sp), 10);
                if (!Number.isFinite(recLen) || recLen <= 0 || i + recLen > text.length) {
                    break;
                }
                const record = text.slice(sp + 1, i + recLen - 1); // drop trailing \n
                const eq = record.indexOf('=');
                if (eq > 0) {
                    out[record.slice(0, eq)] = record.slice(eq + 1);
                }
                i += recLen;
            }
            return out;
        }

        // ---------------------------------------------------------------------
        // GZIP reading (single compressed file)
        // ---------------------------------------------------------------------

        /**
         * A .gz holds a single compressed member - present it as one entry.
         * @returns {Promise<{entries: Array, tree: Object}>}
         */
        async _readGzArchive(ctx) {
            const node = ctx.node;
            // Strip the trailing .gz for the inner file name.
            const name = node.name.replace(/\.gz$/i, '') || node.name;

            // The gzip ISIZE trailer (last 4 bytes, little-endian) is the
            // uncompressed size mod 2^32 - display-only.
            let size = 0;
            if (node.s >= 4) {
                const tail = await this._fetchRange(ctx, node.s - 4, 4);
                const dv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
                size = dv.getUint32(0, true);
            }

            const entries = [{
                name,
                isDir: false,
                isFile: true,
                size,
                mtime: node.ts || 0,
                isGz: true,
                isEncrypted: false,
                isStrongEncrypted: false
            }];
            return {entries, tree: this._buildTree(entries)};
        }

        _findEOCD(buf) {
            const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
            // EOCD is at least 22 bytes; comment is up to 65535. Walk backwards.
            const start = buf.length - 22;
            const minOffset = Math.max(0, buf.length - 22 - 65535);
            for (let i = start; i >= minOffset; i--) {
                if (dv.getUint32(i, true) === SIG_EOCD) {
                    return i;
                }
            }
            return -1;
        }

        _parseEOCD(buf, off) {
            const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
            // Layout of EOCD:
            //   0  sig (4)
            //   4  disk# (2)
            //   6  disk# of cd start (2)
            //   8  entries on this disk (2)
            //  10  total entries (2)
            //  12  cd size (4)
            //  16  cd offset (4)
            //  20  comment length (2)
            const totalEntries = dv.getUint16(off + 10, true);
            const cdSize = dv.getUint32(off + 12, true);
            const cdOffset = dv.getUint32(off + 16, true);

            const isZip64 = (totalEntries === 0xFFFF) ||
                            (cdSize === 0xFFFFFFFF) ||
                            (cdOffset === 0xFFFFFFFF);
            return {totalEntries, cdSize, cdOffset, isZip64};
        }

        async _readZip64Eocd(ctx, tailBytes, eocdOffInBuf) {
            // ZIP64 EOCD locator (20 bytes) sits immediately before the regular EOCD.
            const locOffInBuf = eocdOffInBuf - 20;
            if (locOffInBuf < 0) {
                throw new Error('ZIP64 archive but locator not in tail buffer.');
            }
            const dv = new DataView(tailBytes.buffer, tailBytes.byteOffset, tailBytes.byteLength);
            if (dv.getUint32(locOffInBuf, true) !== SIG_LOC64) {
                throw new Error('ZIP64 EOCD locator signature missing.');
            }
            // Locator layout:
            //   0  sig (4)
            //   4  disk# of zip64 eocd start (4)
            //   8  zip64 eocd offset (8)
            //  16  total disks (4)
            const eocd64Low = dv.getUint32(locOffInBuf + 8, true);
            const eocd64High = dv.getUint32(locOffInBuf + 12, true);
            const eocd64Off = eocd64High * 0x100000000 + eocd64Low;

            // Read the fixed portion (56 bytes) of the ZIP64 EOCD record.
            const eocd64Bytes = await this._fetchRange(ctx, eocd64Off, 56);
            const e64 = new DataView(eocd64Bytes.buffer, eocd64Bytes.byteOffset, eocd64Bytes.byteLength);
            if (e64.getUint32(0, true) !== SIG_EOCD64) {
                throw new Error('ZIP64 EOCD record signature missing.');
            }
            // ZIP64 EOCD layout (selected):
            //   0  sig (4)
            //   4  size of zip64 eocd (8)
            //  12  version made by (2)
            //  14  version needed (2)
            //  16  this disk (4)
            //  20  cd start disk (4)
            //  24  entries on this disk (8)
            //  32  total entries (8)
            //  40  cd size (8)
            //  48  cd offset (8)
            const totalEntries = e64.getUint32(36, true) * 0x100000000 + e64.getUint32(32, true);
            const cdSize = e64.getUint32(44, true) * 0x100000000 + e64.getUint32(40, true);
            const cdOffset = e64.getUint32(52, true) * 0x100000000 + e64.getUint32(48, true);
            return {totalEntries, cdSize, cdOffset, isZip64: true};
        }

        _parseCentralDirectory(buf) {
            const entries = [];
            const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
            let off = 0;
            while (off + 46 <= buf.byteLength) {
                if (dv.getUint32(off, true) !== SIG_CD_ENTRY) {
                    break;
                }
                const entry = this._parseEntry(buf, dv, off);
                entries.push(entry);
                off = entry._nextOffset;
            }
            return entries;
        }

        _parseEntry(buf, dv, off) {
            // Central directory file header layout:
            //   0  sig (4)
            //   4  version made by (2)
            //   6  version needed (2)
            //   8  general purpose bit flag (2)
            //  10  compression method (2)
            //  12  last mod time (2, DOS)
            //  14  last mod date (2, DOS)
            //  16  crc-32 (4)
            //  20  compressed size (4)
            //  24  uncompressed size (4)
            //  28  file name length (2)
            //  30  extra field length (2)
            //  32  file comment length (2)
            //  34  disk number start (2)
            //  36  internal file attributes (2)
            //  38  external file attributes (4)
            //  42  local header offset (4)
            //  46  file name (variable)
            //   ... extra field (variable)
            //   ... file comment (variable)
            const gpFlag = dv.getUint16(off + 8, true);
            const compressionMethod = dv.getUint16(off + 10, true);
            const dosTime = dv.getUint16(off + 12, true);
            const dosDate = dv.getUint16(off + 14, true);
            const crc32 = dv.getUint32(off + 16, true);
            let compSize = dv.getUint32(off + 20, true);
            let uncompSize = dv.getUint32(off + 24, true);
            const nameLen = dv.getUint16(off + 28, true);
            const extraLen = dv.getUint16(off + 30, true);
            const commentLen = dv.getUint16(off + 32, true);
            const externalAttrs = dv.getUint32(off + 38, true);
            let localHeaderOffset = dv.getUint32(off + 42, true);

            const nameBytes = buf.subarray(off + 46, off + 46 + nameLen);
            // GP bit 11 indicates UTF-8; in practice we decode UTF-8 either way
            // (with fatal:false to tolerate legacy CP437 names that happen to
            // contain bytes >= 0x80).
            const name = utf8Decoder.decode(nameBytes);
            const isEncrypted = (gpFlag & GPFLAG_ENCRYPTED) !== 0;
            const isStrongEncrypted = (gpFlag & GPFLAG_STRONG_ENCRYPTED) !== 0;

            // ZIP64 extra field - only present if any of the four sentinel fields
            // (uncompSize, compSize, localHeaderOffset, diskStart) is set.
            if (compSize === 0xFFFFFFFF || uncompSize === 0xFFFFFFFF || localHeaderOffset === 0xFFFFFFFF) {
                const extraStart = off + 46 + nameLen;
                let ei = 0;
                while (ei + 4 <= extraLen) {
                    const headerId = dv.getUint16(extraStart + ei, true);
                    const dataSize = dv.getUint16(extraStart + ei + 2, true);
                    if (headerId === ZIP64_EXTRA_ID) {
                        let ej = extraStart + ei + 4;
                        // Fields appear in this fixed order, each only present if the
                        // corresponding 32-bit field was the sentinel.
                        if (uncompSize === 0xFFFFFFFF) {
                            uncompSize = dv.getUint32(ej, true) +
                                         dv.getUint32(ej + 4, true) * 0x100000000;
                            ej += 8;
                        }
                        if (compSize === 0xFFFFFFFF) {
                            compSize = dv.getUint32(ej, true) +
                                       dv.getUint32(ej + 4, true) * 0x100000000;
                            ej += 8;
                        }
                        if (localHeaderOffset === 0xFFFFFFFF) {
                            localHeaderOffset = dv.getUint32(ej, true) +
                                                dv.getUint32(ej + 4, true) * 0x100000000;
                            ej += 8;
                        }
                        break;
                    }
                    ei += 4 + dataSize;
                }
            }

            // Directory if name ends with '/', or MS-DOS dir attribute is set on
            // the external attrs with zero content.
            const isDir = name.endsWith('/') ||
                          ((externalAttrs & 0x10) !== 0 && uncompSize === 0);

            return {
                name: name.endsWith('/') ? name.slice(0, -1) : name,
                rawName: name,
                isDir,
                isEncrypted,
                isStrongEncrypted,
                compressionMethod,
                compressedSize: compSize,
                uncompressedSize: uncompSize,
                crc32,
                mtime: this._dosToUnix(dosDate, dosTime),
                localHeaderOffset,
                _nextOffset: off + 46 + nameLen + extraLen + commentLen
            };
        }

        _dosToUnix(dosDate, dosTime) {
            if (dosDate === 0 && dosTime === 0) {
                return 0;
            }
            const year   = ((dosDate >> 9) & 0x7F) + 1980;
            const month  = ((dosDate >> 5) & 0x0F);
            const day    = dosDate & 0x1F;
            const hour   = (dosTime >> 11) & 0x1F;
            const minute = (dosTime >> 5) & 0x3F;
            const second = (dosTime & 0x1F) * 2;
            // ZIP dates are local-time historically. We treat them as UTC for
            // determinism; display will use the user's locale formatter.
            return Math.floor(Date.UTC(year, month - 1, day, hour, minute, second) / 1000);
        }

        _buildTree(entries) {
            const root = {dirs: Object.create(null), files: []};
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const parts = entry.name.split('/').filter(Boolean);
                if (!parts.length) {
                    continue;
                }
                let node = root;
                for (let p = 0; p < parts.length - 1; p++) {
                    const part = parts[p];
                    if (!node.dirs[part]) {
                        node.dirs[part] = {dirs: Object.create(null), files: []};
                    }
                    node = node.dirs[part];
                }
                const leaf = parts[parts.length - 1];
                if (entry.isDir) {
                    if (!node.dirs[leaf]) {
                        node.dirs[leaf] = {dirs: Object.create(null), files: []};
                    }
                }
                else {
                    // Carry every format-specific field through to the leaf, and
                    // normalise a `size` (zip exposes uncompressedSize; tar/gz size).
                    node.files.push({
                        ...entry,
                        name: leaf,
                        size: entry.size === undefined ? entry.uncompressedSize : entry.size
                    });
                }
            }
            return root;
        }

        _treeAt(path) {
            const parts = (path || '').split('/').filter(Boolean);
            let node = this.active.tree;
            for (let i = 0; i < parts.length; i++) {
                node = node && node.dirs[parts[i]];
                if (!node) {
                    return null;
                }
            }
            return node;
        }

        // ---------------------------------------------------------------------
        // Byte-range fetch + decryption
        // ---------------------------------------------------------------------

        /**
         * Resolve a reusable download ticket for a node via M.gfsfetch. The resolved object
         * carries the storage URL(s), size and key, so it can be passed back to M.gfsfetch for
         * many ranged reads without re-requesting a ticket each time. RAID, the folder-link API
         * channel and decryption are all handled by gfsfetch.
         * @param {Object} node MEGA file node
         * @returns {Promise<Object>} the gfsfetch ticket data
         */
        _getTicket(node) {
            return M.gfsfetch.getTicketData(node.h);
        }

        /**
         * Read a decrypted byte range of the archive's encrypted file, via M.gfsfetch
         * (handles 16-byte alignment, RAID reconstruction, folder links and decryption).
         * @param {Object} ctx active context (ctx.dlData is the gfsfetch ticket)
         * @param {Number} offset Byte offset within the plaintext file
         * @param {Number} length Number of plaintext bytes wanted
         * @returns {Promise<Uint8Array>}
         */
        _fetchRange(ctx, offset, length) {
            if (length <= 0) {
                return Promise.resolve(new Uint8Array(0));
            }
            return M.gfsfetch(ctx.dlData, offset, offset + length);
        }

        // ---------------------------------------------------------------------
        // Single-file extraction / download
        // ---------------------------------------------------------------------

        /**
         * Download (extract) one file entry from the open archive. Streams to
         * disk via the File System Access API where available; otherwise buffers
         * in memory (capped) and saves via M.saveAs.
         * @param {Object} file A file entry from the archive tree.
         * @returns {Promise<void>}
         */
        async _downloadEntry(file) {
            if (!this.active || !file || file.isDir) {
                return;
            }
            if (file.isEncrypted || file.isStrongEncrypted) {
                mega.ui.toast.show(l.zip_download_encrypted_unsupported);
                return;
            }
            if (!this._isExtractable(file)) {
                mega.ui.toast.show(l.zip_download_unsupported_method);
                return;
            }

            const name = this._safeName(file.name);
            const total = file.size;
            const hasFsApi = typeof self.showSaveFilePicker === 'function';

            if (!hasFsApi && total > DOWNLOAD_BUFFER_CAP) {
                mega.ui.toast.show(l.zip_download_too_large);
                return;
            }

            // Open the save picker FIRST, while we still hold transient user
            // activation (before any network await). null = user cancelled.
            const writable = hasFsApi ? await this._pickSaveTarget(name) : false;
            if (writable === null) {
                return;
            }

            const node = this.active.node;
            const ctx = {node, format: this.active.format};

            // Show an "Initialising..." row in the Transfer Progress Widget NOW,
            // before the (slow) download-URL request + extraction, so the user
            // gets immediate feedback instead of several seconds of silence.
            const tpw = this._tpwBegin(node, name, total);

            return this._pumpDownload(ctx, file, name, total, tpw, writable)
                .then(() => {
                    if (tpw.rowAdded) {
                        mega.tpw.finishDownloadUpload(tpw.gid, tpw.entry, node.h);
                        this._tfsHead({f: tpw.gid});
                    }
                })
                .catch((ex) => {
                    if (d) {
                        console.warn('[zipBrowser] download failed:', ex);
                    }
                    if (writable) {
                        // pipeTo aborts the writable on source error; abort anyway
                        // for failures that happen before piping starts.
                        writable.abort().catch(nop);
                    }
                    if (tpw.rowAdded && mega.tpw) {
                        mega.tpw.errorDownloadUpload(tpw.gid, l.zip_download_error);
                        this._tfsHead({e: tpw.gid});
                    }
                    else {
                        mega.ui.toast.show(l.zip_download_error);
                    }
                });
        }

        /**
         * Show the save-file picker and return its writable, or null if the user
         * cancelled. Uses promise rejection handling (no try/catch); a non-cancel
         * error rejects so the caller's .catch() handles it.
         * @returns {Promise<FileSystemWritableFileStream|null>}
         */
        _pickSaveTarget(name) {
            return self.showSaveFilePicker({suggestedName: name})
                .then((handle) => handle.createWritable(), (ex) => {
                    if (ex && ex.name === 'AbortError') {
                        return null;
                    }
                    throw ex;
                });
        }

        /**
         * Fetch a fresh download ticket, build the entry stream + progress, and pump
         * it to the sink (disk writable or buffered M.saveAs). Throws on failure
         * (the caller's .catch() handles it) - no try/catch here.
         */
        async _pumpDownload(ctx, file, name, total, tpw, writable) {
            // Re-request a fresh ticket (the one obtained at open() may have aged).
            ctx.dlData = await this._getTicket(ctx.node);

            let stream = await this._entryReadable(ctx, file);
            stream = this._progressStream(stream, total, tpw.gid, tpw.startTime);

            if (writable) {
                await stream.pipeTo(writable);
            }
            else {
                await this._saveStreamBuffered(stream, name);
            }
        }

        /**
         * Create a synthetic Transfer Progress Widget row immediately, shown as
         * "Initialising...", so the user gets instant feedback before the slow
         * fetch/extract work begins. Returns the ids needed to drive/finish it.
         *
         * GID shape: dl_zipbrowser<seq>_<zipNodeHandle>:
         *  - the 'dl_zipbrowser' prefix (>11 chars) can't collide with a real
         *    download GID (dl_ + 8-char handle), so CSS targets our rows
         *    (css/zipbrowser.css hides their pause/cancel actions);
         *  - the trailing segment is the real zip node handle, so the TPW's
         *    completed-row hover handler (M.getNodeRoot(id.split('_').pop()))
         *    resolves instead of throwing on a synthetic id.
         *
         * @returns {{gid:String, entry:Object, startTime:Number, rowAdded:Boolean}}
         */
        _tpwBegin(node, name, size) {
            const uid = `zipbrowser${++downloadSeq}_${node.h}`;
            const gid = `dl_${uid}`;
            const entry = {dl_id: uid, id: uid, n: name, size};
            const startTime = Date.now();
            let rowAdded = false;

            if (mega.tpw) {
                mega.tpw.showWidget();
                mega.tpw.addDownloadUpload(mega.tpw.DOWNLOAD, entry);
                rowAdded = mega.tpw.domReady;
                if (rowAdded) {
                    // Register in the header stats (also lazily initialises
                    // tfsheadupdate.stats, which the tab handlers destructure).
                    this._tfsHead({a: gid});
                    // Label it "Initialising..." until the first progress chunk.
                    mega.tpw.updateDOMRow(gid, {statusText: l[17794]});
                    mega.tpw.showWidget();
                }
            }
            return {gid, entry, startTime, rowAdded};
        }

        /**
         * Mirror the header-stats bookkeeping a real transfer performs, so the
         * Transfer Progress Widget's tab handlers (which destructure
         * tfsheadupdate.stats) work and the Active/Completed/Error counts stay
         * accurate for our synthetic transfers. No-op if the helper is absent.
         * @param {Object} update Single-key op, e.g. {a|f|e: gid}
         */
        _tfsHead(update) {
            if (typeof tfsheadupdate === 'function') {
                tryCatch(() => tfsheadupdate(update))();
            }
        }

        /**
         * Wrap a stream so each chunk's bytes advance the Transfer Progress
         * Widget row (throttled), with a final 100% update on flush.
         */
        _progressStream(stream, total, gid, startTime) {
            let counted = 0;
            let lastTick = 0;
            const push = (final) => {
                if (!mega.tpw) {
                    return;
                }
                const now = Date.now();
                if (!final && now - lastTick < 150) {
                    return;
                }
                lastTick = now;
                const perc = total ? Math.min(100, Math.round(counted / total * 100)) : 100;
                mega.tpw.updateDownloadUpload(mega.tpw.DOWNLOAD, gid, perc, counted, total, 0, 0, startTime);
            };
            // eslint-disable-next-line compat/compat -- Streams API; web-streams-polyfill is bundled.
            return stream.pipeThrough(new TransformStream({
                transform: (chunk, controller) => {
                    counted += chunk.byteLength;
                    push(false);
                    controller.enqueue(chunk);
                },
                flush: () => push(true)
            }));
        }

        /**
         * Resolve the byte offset of an entry's file data by reading its LOCAL
         * file header. The central-directory offset points at the local header,
         * whose name/extra lengths may differ from the central record.
         */
        async _entryDataOffset(ctx, file) {
            const hdr = await this._fetchRange(ctx, file.localHeaderOffset, LOCAL_HEADER_SIZE);
            const dv = new DataView(hdr.buffer, hdr.byteOffset, hdr.byteLength);
            if (dv.getUint32(0, true) !== SIG_LOCAL_HEADER) {
                throw new Error('Local file header signature missing.');
            }
            const nameLen = dv.getUint16(26, true);
            const extraLen = dv.getUint16(28, true);
            return file.localHeaderOffset + LOCAL_HEADER_SIZE + nameLen + extraLen;
        }

        /**
         * A pull-based ReadableStream of `byteLength` raw bytes starting at
         * `dataOffset`, fetched + AES-decrypted in chunks. Backpressure from the
         * sink keeps memory flat for arbitrarily large entries.
         */
        _entryStream(ctx, dataOffset, byteLength) {
            const total = byteLength;
            let produced = 0;
            return new ReadableStream({
                pull: async(controller) => {
                    if (produced >= total) {
                        controller.close();
                        return;
                    }
                    const want = Math.min(DOWNLOAD_CHUNK, total - produced);
                    const chunk = await this._fetchRange(ctx, dataOffset + produced, want);
                    if (!chunk.byteLength) {
                        // Guard against a stuck stream on a short/zero read.
                        controller.close();
                        return;
                    }
                    produced += chunk.byteLength;
                    controller.enqueue(chunk);
                    if (produced >= total) {
                        controller.close();
                    }
                }
            });
        }

        /**
         * Whether an entry can be extracted (download/copy) in the current format.
         * @param {Object} file entry from the tree
         * @returns {Boolean}
         */
        _isExtractable(file) {
            switch (this.active.format) {
                case 'gz':
                    return true;
                case 'tar':
                    return !!file.isFile;
                default:
                    // zip: STORED or DEFLATE only.
                    return file.compressionMethod === METHOD_STORED
                        || file.compressionMethod === METHOD_DEFLATE;
            }
        }

        /**
         * Build a plaintext ReadableStream of an entry's contents, per format.
         * @returns {Promise<ReadableStream>}
         */
        async _entryReadable(ctx, file) {
            if (ctx.format === 'gz') {
                // Single gzip member - decompress the whole file stream.
                const gz = this._entryStream(ctx, 0, ctx.node.s);
                // eslint-disable-next-line compat/compat -- Compression Streams API (native; not
                // polyfilled). canOpen() gates the feature on self.DecompressionStream.
                return gz.pipeThrough(new DecompressionStream('gzip'));
            }
            if (ctx.format === 'tar') {
                // Stored (uncompressed) - raw bytes at the entry's data offset.
                return this._entryStream(ctx, file.dataOffset, file.size);
            }
            // zip
            const dataOffset = await this._entryDataOffset(ctx, file);
            const stream = this._entryStream(ctx, dataOffset, file.compressedSize);
            if (file.compressionMethod !== METHOD_DEFLATE) {
                return stream;
            }
            // eslint-disable-next-line compat/compat -- Streams API; web-streams-polyfill is bundled.
            return stream.pipeThrough(new DecompressionStream('deflate-raw'));
        }

        /**
         * Buffer the stream fully into a single Uint8Array (capped). Shared by
         * the buffered download fallback and the copy-to-cloud flow.
         */
        async _collectStream(stream) {
            const reader = stream.getReader();
            const chunks = [];
            let total = 0;
            for (;;) {
                const {done, value} = await reader.read();
                if (done) {
                    break;
                }
                total += value.byteLength;
                if (total > DOWNLOAD_BUFFER_CAP) {
                    reader.cancel().catch(nop);
                    throw new Error('Decompressed size exceeds the in-memory cap.');
                }
                chunks.push(value);
            }
            const out = new Uint8Array(total);
            let off = 0;
            for (let i = 0; i < chunks.length; i++) {
                out.set(chunks[i], off);
                off += chunks[i].byteLength;
            }
            return out;
        }

        /**
         * Buffer the stream in memory (capped) then save via M.saveAs. Used when
         * the File System Access API is unavailable.
         */
        async _saveStreamBuffered(stream, name) {
            M.saveAs(await this._collectStream(stream), name);
        }

        /**
         * Copy (extract + upload) one file entry into a cloud folder the user
         * picks. Buffers the inflated bytes (the uploader needs a full File), so
         * a size cap applies. The upload surfaces in the Transfer Progress Widget
         * automatically via ulmanager.
         * @param {Object} file A file entry from the archive tree.
         * @returns {Promise<void>}
         */
        async _copyEntry(file) {
            if (!this.active || !file || file.isDir) {
                return;
            }
            if (file.isEncrypted || file.isStrongEncrypted) {
                mega.ui.toast.show(l.zip_copy_encrypted_unsupported);
                return;
            }
            if (!this._isExtractable(file)) {
                mega.ui.toast.show(l.zip_copy_unsupported_method);
                return;
            }
            if (file.size > DOWNLOAD_BUFFER_CAP) {
                mega.ui.toast.show(l.zip_copy_too_large);
                return;
            }

            // Capture everything we need BEFORE opening the dialog: the picker
            // could outlive the overlay (a stray navigation would close it), so
            // we must not read this.active afterwards.
            const name = this._safeName(file.name);
            const ctx = {node: this.active.node, format: this.active.format};

            // Let the user choose a destination folder in their cloud drive.
            const target = await selectFolderDialog();
            if (!target) {
                return;   // dialog cancelled
            }

            // Instant "Initialising..." row for the extraction phase. The upload
            // row (from M.addUpload) only appears once we have the full File, so
            // without this the user would see nothing while a large entry is
            // fetched + decompressed into memory.
            const tpw = this._tpwBegin(ctx.node, name, file.size);

            return this._pumpCopy(ctx, file, name, target, tpw)
                .catch((ex) => {
                    if (d) {
                        console.warn('[zipBrowser] copy failed:', ex);
                    }
                    if (tpw.rowAdded && mega.tpw) {
                        mega.tpw.errorDownloadUpload(tpw.gid, l.zip_copy_error);
                        this._tfsHead({e: tpw.gid});
                    }
                    else {
                        mega.ui.toast.show(l.zip_copy_error);
                    }
                });
        }

        /**
         * Extract an entry fully into memory, close out the prep row, then hand
         * the bytes to the upload pipeline. Throws on failure (caller's .catch()
         * handles it) - no try/catch here.
         */
        async _pumpCopy(ctx, file, name, target, tpw) {
            ctx.dlData = await this._getTicket(ctx.node);
            let stream = await this._entryReadable(ctx, file);
            stream = this._progressStream(stream, file.size, tpw.gid, tpw.startTime);

            const bytes = await this._collectStream(stream);

            // Extraction done - close out the prep row; the upload pipeline
            // (M.addUpload) then shows its own row for the upload phase and
            // encrypts client-side.
            if (tpw.rowAdded) {
                mega.tpw.finishDownloadUpload(tpw.gid, tpw.entry, ctx.node.h);
                this._tfsHead({f: tpw.gid});
            }

            const f = new File([bytes], name, {type: 'application/octet-stream'});
            M.addUpload([f], false, null, target);
        }

        /**
         * Sanitize an in-archive entry name into a safe download file name:
         * basename only, control + reserved characters replaced.
         */
        _safeName(name) {
            return M.getSafeName(`${name}`.split(/[/\\]/).pop()) || 'download';
        }

        // ---------------------------------------------------------------------
        // DOM mount / unmount / render
        // ---------------------------------------------------------------------

        _mount(node, format) {
            // The Recents view lives in its own section (.fm-recents.container), a sibling of
            // the regular FM block; mount into whichever is the active view's container.
            const hostSelector = M.currentdirid === 'recents'
                ? '.fm-recents.container'
                : '.fm-right-files-block';
            const host = document.querySelector(hostSelector);
            if (!host) {
                throw new Error(`FM container (${hostSelector}) not found.`);
            }
            // Marker class - css/zipbrowser.css hides the host's own views/headers
            // underneath while this is set. Reversible on close.
            host.classList.add('zip-browser-open');

            const overlay = document.createElement('div');
            overlay.className = 'zip-explorer-overlay';
            // Block FM's contextmenu handler from popping for our rows.
            overlay.addEventListener('contextmenu', (e) => e.preventDefault());
            host.appendChild(overlay);

            // Push a sentinel history state so a browser Back lands here and
            // closes the view (via popstate) while keeping the FM at the .zip's
            // folder. navigateTo() pushes further states so Back also steps
            // through in-archive sub-folders.
            pushHistoryState(page, {zipBrowser: {handle: node.h, path: ''}});

            // Browser Back/Forward: re-render the popped in-archive path, or
            // close once we step out of our own entries.
            const onPopState = (ev) => {
                const st = ev.state && ev.state.zipBrowser;
                if (st && this.active && st.handle === this.active.node.h) {
                    this.active.path = st.path || '';
                    this._render();
                }
                else if (this.active) {
                    this.close();
                }
            };
            window.addEventListener('popstate', onPopState);

            // Any FM navigation (tree click, breadcrumb, search, ...) goes through
            // loadSubPage/history.pushState - which does NOT fire popstate - but
            // it does broadcast 'pagechange'. Close the overlay on that so we
            // never linger over a different folder.
            const pageChangeListener = mBroadcaster.addListener('pagechange', () => {
                if (this.active) {
                    this.close();
                }
            });

            this.active = {
                node,
                format,
                host,
                dlData: null,
                entries: null,
                tree: null,
                path: '',
                container: overlay,
                onPopState,
                pageChangeListener
            };
        }

        _renderStatus(message) {
            if (!this.active) {
                return;
            }
            const container = this.active.container;
            container.textContent = '';
            container.appendChild(this._renderBreadcrumb(true));
            const status = document.createElement('div');
            status.className = 'zip-explorer-status';
            status.textContent = message;
            container.appendChild(status);
        }

        _render() {
            if (!this.active) {
                return false;
            }
            const container = this.active.container;
            container.textContent = '';
            container.appendChild(this._renderBreadcrumb(false));

            const grid = document.createElement('div');
            grid.className = 'zip-explorer-grid';

            const treeNode = this._treeAt(this.active.path);
            if (treeNode) {
                grid.appendChild(this._renderHeaderRow());
                const folderNames = Object.keys(treeNode.dirs).sort((a, b) => a.localeCompare(b));
                for (let i = 0; i < folderNames.length; i++) {
                    grid.appendChild(this._renderFolderRow(folderNames[i]));
                }
                const files = [...treeNode.files].sort((a, b) => a.name.localeCompare(b.name));
                for (let i = 0; i < files.length; i++) {
                    grid.appendChild(this._renderFileRow(files[i]));
                }
                if (folderNames.length === 0 && files.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'zip-explorer-empty';
                    empty.textContent = l.zip_folder_empty;
                    grid.appendChild(empty);
                }
            }
            else {
                const empty = document.createElement('div');
                empty.className = 'zip-explorer-empty';
                empty.textContent = l.zip_folder_not_found;
                grid.appendChild(empty);
            }

            container.appendChild(grid);
            return !!this.active;
        }

        _renderBreadcrumb(loading) {
            const bar = document.createElement('div');
            bar.className = 'zip-explorer-breadcrumb';

            const badge = document.createElement('span');
            badge.className = 'zip-explorer-badge';
            badge.title = l.zip_browser_badge_tooltip;
            badge.appendChild(this._spriteIcon('icon-download-zip'));
            bar.appendChild(badge);

            const crumbs = document.createElement('span');
            crumbs.className = 'zip-explorer-crumbs';

            // Parent-folder crumb - clicking it closes the viewer and returns to
            // the FM folder that contains the .zip.
            const parentHandle = this.active.node.p;
            const parentName = M.getNameByHandle(parentHandle);
            if (parentName) {
                const parentCrumb = document.createElement('a');
                parentCrumb.href = '#';
                parentCrumb.className = 'zip-explorer-crumb';
                parentCrumb.textContent = parentName;
                parentCrumb.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._closeToParent();
                });
                crumbs.appendChild(parentCrumb);

                const psep = document.createElement('span');
                psep.className = 'zip-explorer-sep';
                psep.textContent = CRUMB_SEP;
                crumbs.appendChild(psep);
            }

            const rootCrumb = document.createElement('a');
            rootCrumb.href = '#';
            rootCrumb.className = 'zip-explorer-crumb';
            rootCrumb.textContent = this.active.node.name || 'archive.zip';
            rootCrumb.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('');
            });
            crumbs.appendChild(rootCrumb);

            if (!loading) {
                const parts = (this.active.path || '').split('/').filter(Boolean);
                let accum = '';
                for (let i = 0; i < parts.length; i++) {
                    const sep = document.createElement('span');
                    sep.className = 'zip-explorer-sep';
                    sep.textContent = CRUMB_SEP;
                    crumbs.appendChild(sep);

                    accum = accum ? `${accum}/${parts[i]}` : parts[i];
                    const c = document.createElement('a');
                    c.href = '#';
                    c.className = 'zip-explorer-crumb';
                    c.textContent = parts[i];
                    const target = accum;
                    c.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.navigateTo(target);
                    });
                    crumbs.appendChild(c);
                }
            }

            bar.appendChild(crumbs);

            const spacer = document.createElement('span');
            spacer.className = 'zip-explorer-spacer';
            bar.appendChild(spacer);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'zip-explorer-close';
            closeBtn.title = l[148] || 'Close';
            closeBtn.appendChild(this._spriteIcon('icon-dialog-close'));
            closeBtn.addEventListener('click', () => {
                // Fully close and return to the .zip's parent FM folder.
                this._closeToParent();
            });
            bar.appendChild(closeBtn);

            return bar;
        }

        _renderHeaderRow() {
            const row = document.createElement('div');
            row.className = 'zip-explorer-row zip-explorer-header';
            row.appendChild(this._cell('col-name', l[86]));     // Name
            row.appendChild(this._cell('col-type', l[93]));     // Type
            row.appendChild(this._cell('col-size', l[87]));     // Size
            row.appendChild(this._cell('col-date', l[94]));     // Last modified
            return row;
        }

        _renderFolderRow(name) {
            const row = document.createElement('div');
            row.className = 'zip-explorer-row zip-explorer-folder';
            row.appendChild(this._nameCell(name, 'icon-folder-24'));
            row.appendChild(this._cell('col-type', l[1049]));   // Folder
            row.appendChild(this._cell('col-size', EMPTY_CELL));
            row.appendChild(this._cell('col-date', EMPTY_CELL));
            row.addEventListener('dblclick', () => {
                const newPath = this.active.path ? `${this.active.path}/${name}` : name;
                this.navigateTo(newPath);
            });
            return row;
        }

        _renderFileRow(file) {
            const row = document.createElement('div');
            row.className = 'zip-explorer-row zip-explorer-file';

            let typeLabel = '';
            if (typeof filetype === 'function') {
                // tryCatch wraps the (sync) filetype call; `false` suppresses logging.
                typeLabel = tryCatch(() => filetype({name: file.name}, false), false)() || '';
            }
            if (!typeLabel) {
                const ext = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : '';
                typeLabel = ext ? l.zip_filetype_ext.replace('[X]', ext) : l.zip_filetype_file;
            }

            const sizeText = typeof bytesToSize === 'function'
                ? bytesToSize(file.size, 1)
                : `${file.size} B`;

            const dateText = file.mtime && typeof time2date === 'function'
                ? time2date(file.mtime, 0)
                : '';

            const lock = file.isEncrypted ? this._spriteIcon('icon-lock-thin-outline', 'zip-explorer-lock') : null;
            if (lock) {
                lock.title = l.zip_entry_encrypted_tooltip;
            }

            row.appendChild(this._nameCell(file.name, this._iconClass(file), lock));
            row.appendChild(this._cell('col-type', typeLabel));
            row.appendChild(this._cell('col-size', sizeText));
            row.appendChild(this._cell('col-date', dateText));

            // Double-click a file to download (extract) it from the archive.
            row.addEventListener('dblclick', () => this._triggerDownload(file));

            // Right-click shows our own one-item ("Download") context menu.
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._showFileMenu(e, file, row);
            });
            return row;
        }

        /**
         * Kick off a download, surfacing any rejection as an error toast.
         * (_downloadEntry handles in-flight errors itself; this catches the
         * pre-stream rejections, e.g. a save-picker failure.)
         */
        _triggerDownload(file) {
            this._downloadEntry(file).catch((ex) => {
                if (d) {
                    console.warn('[zipBrowser] download failed:', ex);
                }
                mega.ui.toast.show(l.zip_download_error);
            });
            eventlog(501258);   // download triggered from the zip browser
        }

        /**
         * Kick off a copy-to-cloud, surfacing any rejection as an error toast.
         */
        _triggerCopy(file) {
            this._copyEntry(file).catch((ex) => {
                if (d) {
                    console.warn('[zipBrowser] copy failed:', ex);
                }
                mega.ui.toast.show(l.zip_copy_error);
            });
            eventlog(501259);   // copy triggered from the zip browser
        }

        /**
         * Show the file-row context menu ("Download", "Copy"), reusing MEGA's
         * generic menu component + MegaButton items (so they get the exact FM
         * styling). DOM built without innerHTML.
         */
        _showFileMenu(e, file, row) {
            if (!(mega.ui && mega.ui.menu) || typeof MegaButton !== 'function') {
                // No menu component available - fall back to a direct download.
                this._triggerDownload(file);
                return;
            }

            // Mirror the FM context menu: a `.context-menu-items` wrapper holding
            // MegaButton items (which produce the exact `.nav-elem.context-button`
            // markup/styling FM uses).
            const items = document.createElement('div');
            items.className = 'context-menu-items';

            // eslint-disable-next-line no-new
            new MegaButton({
                parentNode: items,
                type: 'fullwidth',
                text: l[58],   // Download
                icon: 'sprite-fm-mono icon-arrow-down-circle-thin-outline',
                iconSize: 24,
                componentClassname: 'context-button text-icon',
                onClick: () => {
                    mega.ui.menu.hide();
                    this._triggerDownload(file);
                }
            });

            // Copy-to-cloud is offered only outside folder links (a folder link has no
            // signed-in upload target by design - download is the only action there).
            if (!folderlink) {
                // eslint-disable-next-line no-new
                new MegaButton({
                    parentNode: items,
                    type: 'fullwidth',
                    text: l[63],   // Copy
                    icon: 'sprite-fm-mono icon-copy-thin-outline',
                    iconSize: 24,
                    componentClassname: 'context-button text-icon',
                    onClick: () => {
                        mega.ui.menu.hide();
                        this._triggerCopy(file);
                    }
                });
            }

            // mega.ui.menu positions a contextmenu event via originalEvent.clientX/Y
            // and reads (eventTarget||event.currentTarget).getBoundingClientRect().
            const jev = new $.Event('contextmenu');
            jev.originalEvent = e;

            mega.ui.menu.show({
                name: 'zip-context-menu',
                classList: ['context-menu'],
                event: jev,
                eventTarget: row,
                contents: [items]
            });
        }

        /**
         * Build the Name cell: type icon + (text) name + optional trailing icon.
         * All text via textContent; no HTML sink - safe for hostile filenames.
         */
        _nameCell(name, iconClass, trailingIcon) {
            const cell = document.createElement('div');
            cell.className = 'col-name';

            const icon = document.createElement('span');
            icon.className = 'item-type-icon';
            if (iconClass) {
                icon.classList.add(iconClass);
            }
            cell.appendChild(icon);

            const label = document.createElement('span');
            label.className = 'zip-explorer-name';
            label.textContent = name;
            cell.appendChild(label);

            if (trailingIcon) {
                cell.appendChild(trailingIcon);
            }
            return cell;
        }

        /**
         * Map a zip entry to a MEGA file-type sprite class, mirroring the core of
         * fileIcon() but without its dependency on real M.d nodes / getNodeRoot.
         * Returns a whitelisted `icon-<type>-24` token (defense-in-depth; the
         * value is only ever used via classList.add, never an HTML sink).
         */
        _iconClass(entry) {
            if (entry.isDir) {
                return 'icon-folder-24';
            }
            let type = 'generic';
            const e = typeof ext === 'object' && ext[fileext(entry.name, 0, 1)];
            if (e && e[0] && e[0] !== 'mega') {
                type = e[0];
            }
            else if (typeof is_video === 'function') {
                const v = is_video({name: entry.name});
                type = v > 1 ? 'audio' : v > 0 ? 'video' : 'generic';
            }
            if (!/^[\da-z-]+$/.test(type)) {
                type = 'generic';
            }
            return `icon-${type}-24`;
        }

        /**
         * Create a MEGA mono-sprite UI icon element.
         * @param {String} iconClass e.g. 'icon-dialog-close' (whitelisted)
         * @param {String} [extraClass] optional extra class
         * @returns {HTMLElement}
         */
        _spriteIcon(iconClass, extraClass) {
            const i = document.createElement('i');
            i.className = 'sprite-fm-mono';
            if (/^[\da-z-]+$/.test(iconClass)) {
                i.classList.add(iconClass);
            }
            if (extraClass) {
                i.classList.add(extraClass);
            }
            return i;
        }

        _cell(cls, text) {
            const cell = document.createElement('div');
            cell.className = cls;
            cell.textContent = text;
            return cell;
        }
    };
});
