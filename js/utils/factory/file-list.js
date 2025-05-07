factory.define('file-list', () => {
    'use strict';

    const reportError = (ex) => {

        if (ex && ex.name !== 'NotFoundError') {

            self.reportError(ex);
        }
        else if (self.d) {

            console.warn(ex);
        }
    };

    const pushFile = (data, file, path) => {
        if (file) {
            if ((path = String(path || file.webkitRelativePath || file.path || '')).includes(file.name)) {
                const p = path.split(/[/\\]/);
                const i = p.length - 1;
                if (p[i] === file.name) {
                    p.splice(i, 1);
                }
                path = `${p.join('/')}`;
            }
            if (file.path !== path) {
                Object.defineProperty(file, 'path', {
                    value: path,
                    writable: true,
                    configurable: true
                });
            }
            data.files.push(file);
        }
    };

    const addFiles = (data, files) => {
        if (Symbol.iterator in files) {
            files = [...files];
        }
        for (let i = files.length; i--;) {
            pushFile(data, files[i]);
            data.paths[files[i].path] = -1;
        }
    };

    const getFile = (entry) => new Promise((resolve, reject) => entry.file(resolve, reject));
    const getEntries = (reader) => new Promise((resolve, reject) => reader.readEntries(resolve, reject));

    const traverse = async(data, entry, path = "", symlink = null) => {

        if (entry.isFile) {
            pushFile(data, await getFile(entry).catch(reportError) || symlink && symlink.getAsFile(), path);
        }
        else if (entry.isDirectory) {
            const p = [];
            const reader = entry.createReader();

            path = `${path + entry.name}/`;
            data.paths[path] = 0;

            while (1) {
                const entries = await getEntries(reader).catch(reportError);
                if (!(entries && entries.length)) {
                    break;
                }
                data.paths[path] += entries.length;

                for (let i = entries.length; i--;) {
                    p.push(traverse(data, entries[i], path));
                }
            }
            return Promise.all(p);
        }
    };

    return freeze({
        getFile,
        getEntries,
        async getFileList(event, flt = echo) {
            const data = {files: [], paths: Object.create(null)};
            const {dataTransfer: {files, items = !1} = false} = event || !1;

            if (items.length && items[0].webkitGetAsEntry) {
                const p = [];

                for (let i = items.length; i--;) {
                    const entry = tryCatch(() => items[i].webkitGetAsEntry())();
                    if (entry) {
                        p.push(traverse(data, entry, '', entry.isFile && items[i]).catch(reportError));
                    }
                }
                await Promise.all(p);

                data.empty = Object.keys(data.paths).filter((p) => data.paths[p] < 1);
            }
            else if (files || event) {
                addFiles(data, files || event.files || event.target && event.target.files || event);
            }
            const res = data.files.filter(flt);

            res.sort((a, b) => a.size < b.size ? -1 : 1);

            return Object.defineProperties(res, {
                paths: {
                    value: data.paths
                },
                empty: {
                    value: data.empty || []
                }
            });
        }
    });
});
