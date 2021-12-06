ZIP Partial DEMO
===============
Please select a ZIP file in the webclient then execute the following code in the console. You will be prompted to select a file to download.
You will notice that only the required bytes to navigate + download specific files inside the ZIP are downloaded. So testing on a 1GB zip file, I can download the 5MB file using only ~5.1MB of bandwidth.

```
let R;
(async () => {
    try {
        await M.require('zipreader_js');

        zip.configure({ chunkSize: 100000 });
        const zipReader = new zip.ZipReader(new zip.MEGAReader($.selected[0], {}));
        const entries = await zipReader.getEntries();

        console.warn("ZIP Files: ", entries);

        let entriesText = '';
        for (let i = 0; i < entries.length; i++) {
            entriesText += '\n ' + i + ': ' + entries[i].filename;
        }

        let zipEntryIndex = null;
        while (zipEntryIndex === null) {
            let entry = prompt("Which file do you want to download: \n" + entriesText);
            let entryIndex = parseInt(entry);

            if (!entry || entryIndex < 0 || entryIndex >= entries.length) {
                alert("Invalid Selection");
                console.warn("Invalid selection");
            }
            else zipEntryIndex = entryIndex;
        }


        const zipentry = entries[zipEntryIndex];
        console.warn("Downloading " + zipentry.filename, zipentry);

        // Download a single file from the ZIP.
        const dataBlobWriter = new zip.BlobWriter("text/plain");
        let file = await zipentry.getData(dataBlobWriter);
        await zipReader.close();

        console.warn("FILE DOWNLOADED", file);

        let link = document.createElement('a');
        link.href = window.URL.createObjectURL(file);
        link.download = zipentry.filename;
        document.body.appendChild(link);
        link.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
        link.remove();
        window.URL.revokeObjectURL(link.href);

    }
    catch (err) {
        console.error(err);
    }
})();
```
