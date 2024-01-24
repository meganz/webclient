
export async function prepareExportIo(dl) {
    const { zname, size } = dl;
    if (
        window.isSecureContext
        && typeof showSaveFilePicker === 'function'
        && typeof FileSystemFileHandle !== 'undefined'
        && 'createWritable' in FileSystemFileHandle.prototype
        && typeof FileSystemWritableFileStream !== 'undefined'
        && 'seek' in FileSystemWritableFileStream.prototype
    ) {
        const file = await window.showSaveFilePicker({ suggestedName: zname }).catch(ex => {
            if (String(ex).includes('aborted')) {
                throw new Error('Aborted');
            }
            dump(ex);
        });
        if (file) {
            const stream = await file.createWritable().catch(dump);
            if (stream) {
                return {
                    stream,
                    write: function(data, position, done) {
                        this.stream.write({ type: 'write', position, data }).then(done).catch(dump);
                    },
                    download: function() {
                        this.abort();
                    },
                    abort: function() {
                        this.stream.close();
                    },
                    setCredentials: function() {
                        this.begin();
                    }
                };
            }
        }
    }
    if (MemoryIO.usable() && Math.min(MemoryIO.fileSizeLimit, 90 * 1024 * 1024) > size) {
        return new MemoryIO('chat_0', dl);
    }
    else if (window.requestFileSystem){
        return new FileSystemAPI('chat_0', dl);
    }
    throw new Error('Download methods are unsupported');
}

export function prepareExportStreams(attachNodes, onEmpty) {
    const CHUNK_SIZE = 1048576; // 1 MB
    const nextChunk = async function(controller, handle, start, size) {
        const fetched = await M.gfsfetch(handle, start, start + size).catch(ex => {
            if (ex === EOVERQUOTA || Object(ex.target).status === 509) {
                return controller.error(ex);
            }
        });

        const input = fetched && fetched.buffer || new ArrayBuffer(0);
        if (!fetched || !fetched.buffer) {
            onEmpty(size);
        }
        controller.enqueue(new Uint8Array(input));
    };

    return attachNodes.map(node => {
        return {
            name: node.name,
            lastModified: new Date((node.mtime || node.ts) * 1000),
            input: new ReadableStream({
                offset: 0,
                start(controller) {
                    this.offset = Math.min(node.s, CHUNK_SIZE);
                    return nextChunk(controller, node.h, 0, this.offset);
                },
                pull(controller) {
                    if (this.offset >= node.s) {
                        controller.close();
                        return;
                    }
                    if (node.s - this.offset >= CHUNK_SIZE) {
                        const chunk = nextChunk(controller, node.h, this.offset, CHUNK_SIZE);
                        this.offset += CHUNK_SIZE;
                        return chunk;
                    }
                    const chunk = nextChunk(controller, node.h, this.offset, node.s - this.offset);
                    this.offset = node.s;
                    return chunk;
                },
            }),
        };
    });
}
