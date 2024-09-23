
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

    return attachNodes.map(node => {
        return {
            name: node.name,
            lastModified: new Date((node.mtime || node.ts) * 1000),
            input: M.gfsfetch.getReadableStream(node, {
                error(ex, n) {
                    if (d) {
                        console.error(`${n.h}: ${ex}`);
                    }
                    onEmpty(n.s);
                }
            })
        };
    });
}
