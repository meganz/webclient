lazy(mega.ui.pm.settings, 'utils', () => {
    'use strict';

    return freeze({

        selectProvider(e) {

            const importBtn = document.querySelector('.import-file');
            const chooseFileBtn = document.querySelector('.choose-file');
            const importBtnText = document.querySelector('.import-passwords-label');
            const errorMessage = document.querySelector('.import-error-message');
            const fileInput = document.querySelector('#file-select');
            mega.ui.pm.settings.importSelected = e.currentTarget.selected;
            e.currentTarget.text = mega.ui.pm.settings.importProvider[e.currentTarget.selected];
            mega.ui.pm.settings.file = null;
            importBtn.disabled = true;
            chooseFileBtn.disabled = false;
            importBtn.loading = false;
            importBtnText.textContent = l.import_passwords_label;
            errorMessage.classList.add('hidden');
            fileInput.value = '';
        },

        getFile() {

            if (mega.pm.validateUserStatus()) {
                const fileInput = document.getElementById('file-select');
                fileInput.click();
            }
        },

        /**
         * Parses a CSV text input into an array of objects based on the specified type.
         *
         * @param {string} text - The CSV text to be parsed.
         * @param {string} type - The type of CSV being parsed. Can be 'lastpass', 'keepass', or 'google'.
         * @returns {Array<Object>} An array of objects representing each row in the CSV.
         */
        parseCSV(text, type) {

            const lineEnd = text.charAt(text.indexOf('\n') - 1) === '\r' ? 'windows' : 'linux';
            const lines = text.split('\n');
            const result = [];
            const headers = this.getHeaders(type);

            let inQuotes = false;
            let currentLine = [];

            for (let i = 1; i < lines.length; i++) {

                if (inQuotes) {
                    let split = [];
                    ({line: split, inQuotes} = this.splitCSVLine(lines[i], true));
                    currentLine[currentLine.length - 1] = `${currentLine[currentLine.length - 1]}\n${split[0]}`;
                    currentLine = [...currentLine, ...split.slice(1)];
                }
                else {
                    ({line: currentLine, inQuotes} = this.splitCSVLine(lines[i], false));
                }

                if (type === 'lastpass') {
                    inQuotes = currentLine.length !== headers.length;
                }
                else if (type === 'keepass') {
                    inQuotes = !lines[i].endsWith('"');
                }
                else if (type === 'google' && lineEnd === 'windows') {
                    inQuotes = !lines[i].trimEnd().endsWith(',')
                        && !lines[i].trimEnd().endsWith('"') && !lines[i].endsWith('\r');
                }

                if (!inQuotes && currentLine.length === headers.length) {
                    const obj = {};
                    for (let j = 0; j < headers.length; j++) {
                        obj[headers[j]] = currentLine[j].trim();
                    }
                    result.push(obj);
                }
            }
            return result;
        },

        /**
         * Splits a line of CSV text into an array of values, handling quotes and escaped quotes.
         *
         * @param {string} line - A single line of CSV text to split.
         * @param {boolean} inQuotes - Whether the line starts within a quoted section.
         * @returns {{line: string[], inQuotes: boolean}} An object with the line as an array
         * and the updated inQuotes status.
         */
        splitCSVLine(line, inQuotes) {

            const result = [];
            let current = '';

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                        // Escaped quote inside a quoted value
                        current += '"';
                        i++;
                    }
                    else {
                        // Toggle inQuotes flag
                        inQuotes = !inQuotes;
                    }
                }
                else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                }
                else {
                    current += char;
                }
            }
            result.push(current);
            return {line: result, inQuotes};
        },

        async saveData(data, type) {

            data = data.map(entry => this.getPasswordData(entry, type));

            const {pm, pwmh} = mega;
            for (const entry of data) {
                const {name} = entry;
                await pm.createItem(entry, name, pwmh);
            }

            return true;
        },

        getHeaders(type) {

            if (type === 'keepass') {
                return ["Group", "Title", "Username", "Password", "URL", "Notes", "TOTP", "Icon", "Last Modified",
                        "Created"];
            }
            else if (type === 'google') {
                return ['name', 'url', 'username', 'password', 'note'];
            }
            else if (type === 'lastpass') {
                return ['url', 'username', 'password', 'totp', 'extra', 'name', 'grouping', 'fav'];
            }
        },

        getPasswordData(entry, type) {

            if (type === 'keepass') {
                return {name: entry.Title, pwm: {pwd: entry.Password, u: entry.Username, n: entry.Notes,
                                                 url: entry.URL}};
            }
            else if (type === 'google') {
                return {name: entry.name, pwm: {pwd: entry.password, u: entry.username, n: entry.note,
                                                url: entry.url}};
            }
            else if (type === 'lastpass') {
                return {name: entry.name, pwm: {pwd: entry.password, u: entry.username, n: entry.extra,
                                                url: entry.url}};
            }
        }
    });
});
