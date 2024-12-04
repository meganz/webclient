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

                if (lines[i].length === 0) {
                    continue;
                }

                if (inQuotes) {
                    let split = [];
                    ({line: split, inQuotes} = this.splitCSVLine(lines[i], true));
                    currentLine[currentLine.length - 1] = `${currentLine[currentLine.length - 1]}\n${split[0]}`;
                    currentLine = [...currentLine, ...split.slice(1)];
                }
                else {
                    ({line: currentLine, inQuotes} = this.splitCSVLine(lines[i], false));
                }

                if (type === '1password') {
                    inQuotes = !currentLine[8].length;
                }
                else if (type === 'keepass') {
                    inQuotes = !lines[i].endsWith('"');
                }
                else if ((type === 'google' || type === 'other') && lineEnd === 'windows') {
                    inQuotes = !lines[i].trimEnd().endsWith(',')
                        && !lines[i].trimEnd().endsWith('"') && !lines[i].endsWith('\r');
                }
                else {
                    inQuotes = currentLine.length !== headers.length;
                }

                if (!inQuotes && currentLine.length === headers.length) {
                    const obj = {};
                    for (let j = 0; j < headers.length; j++) {
                        obj[headers[j]] = currentLine[j].trim();
                    }
                    if (type === 'nordpass' && obj.type !== 'password' || type === 'proton' && obj.type !== 'login') {
                        continue;
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
                const name = this.getDeduplicateName(entry.name);
                await pm.createItem(entry, name, pwmh);
            }

            return true;
        },

        getHeaders(type) {

            if (type === 'keepass') {
                return ["Group", "Title", "Username", "Password", "URL", "Notes", "TOTP", "Icon", "Last Modified",
                        "Created"];
            }
            else if (type === 'google' || type === 'other') {
                return ['name', 'url', 'username', 'password', 'note'];
            }
            else if (type === 'lastpass') {
                return ['url', 'username', 'password', 'totp', 'extra', 'name', 'grouping', 'fav'];
            }
            else if (type === 'nordpass') {
                return [
                    'name', 'url', 'additional_urls', 'username', 'password', 'note', 'cardholdername', 'cardnumber',
                    'cvc', 'pin', 'expirydate', 'zipcode', 'folder', 'full_name', 'phone_number', 'email', 'address1',
                    'address2', 'city', 'country', 'state', 'type', 'custom_fields'
                ];
            }
            else if (type === 'bitwarden') {
                return [
                    'folder', 'favorite', 'type', 'name', 'notes', 'fields', 'reprompt', 'login_uri', 'login_username',
                    'login_password', 'login_totp'
                ];
            }
            else if (type === '1password') {
                return ['Title', 'Url', 'Username', 'Password', 'OTPAuth', 'Favorite', 'Archived', 'Tags', 'Notes'];
            }
            else if (type === 'dashlane') {
                return ['username', 'username2', 'username3', 'title', 'password', 'note', 'url', 'category', 'otpUrl'];
            }
            else if (type === 'proton') {
                return [
                    'type', 'name', 'url', 'email', 'username', 'password', 'note', 'totp', 'createTime', 'modifyTime',
                    'vault'
                ];
            }
        },

        /**
         *
         * @param {Object} entry Entry of the imported password line
         * @param {string} type Import provider
         * @returns {{pwm: {u: string, pwd: string, n: string, url: string}, name: string}}
         * Mapped import line in password item
         */
        getPasswordData(entry, type) {

            if (type === 'keepass') {
                return {name: entry.Title, pwm: {pwd: entry.Password, u: entry.Username, n: entry.Notes,
                                                 url: entry.URL}};
            }
            else if (type === 'google' || type === 'other' || type === 'nordpass' || type === 'proton') {
                return {name: entry.name, pwm: {pwd: entry.password, u: entry.username, n: entry.note, url: entry.url}};
            }
            else if (type === 'lastpass') {
                return {name: entry.name, pwm: {pwd: entry.password, u: entry.username, n: entry.extra,
                                                url: entry.url}};
            }
            else if (type === 'bitwarden') {
                return {
                    name: entry.name, pwm: {
                        pwd: entry.login_password, u: entry.login_username, n: entry.notes,
                        url: entry.login_uri
                    }
                };
            }
            else if (type === '1password') {
                return {name: entry.Title, pwm: {pwd: entry.Password, u: entry.Username, n: entry.Notes,
                                                 url: entry.Url}};
            }
            else if (type === 'dashlane') {
                return {name: entry.title, pwm: {pwd: entry.password, u: entry.username, n: entry.note,
                                                 url: entry.url}};
            }
        },

        getDeduplicateName(passwordTitle) {

            const existingNames = new Set(Object.values(M.d).map(item => item.name));
            let newName = passwordTitle;
            const match = newName.match(/\((\d+)\)$/);
            const baseName = match ? newName.replace(/\(\d+\)$/, '').trim() : newName;
            let counter = match ? parseInt(match[1], 10) : 1;

            while (existingNames.has(newName)) {
                newName = `${baseName} (${counter})`;
                counter++;
            }

            return newName;
        }
    });
});
