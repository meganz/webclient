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

            const result = [[], {}];
            const headers = this.getHeaders(type);

            let inQuotes = false;
            let currentItem = '';
            let currentLine = {};
            let col = 0;
            let lineNum = 1;

            const _validateLine = line => {

                // check first line is same as known header structure
                if (lineNum === 1) {
                    return Object.values(line).join(',') === headers.join(',');
                }

                // check header and line has same column length
                if (Object.keys(line).length !== headers.length) {
                    const keys = Object.keys(line);
                    // if line is empty, ignore it
                    return keys.length === 1 && line[keys[0]] === '' ? undefined : false;
                }

                if (type === 'nordpass' || type === 'proton') {
                    const allowedType = type === 'nordpass' ? 'password' : 'login';

                    if (line.type.trim() !== allowedType) {
                        return;
                    }
                }

                return true;
            };

            // check every character in the text to determine row parsing
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const nextChar = text[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        // This is an escaped double quote, just add it to the current line
                        currentItem += char;
                        i++; // skip the next double quote
                    }
                    else {
                        // this is real double quote
                        inQuotes = !inQuotes;
                    }
                }
                else if (!inQuotes && (char === ',' || char === '\n' || char === '\r' && nextChar === '\n')) {

                    // end of column or this is new line let's add to the result array
                    currentLine[headers[col]] = currentItem.trim();
                    currentItem = '';
                    col++;

                    // if this is new line, increment the line number
                    if (char !== ',') {

                        const valid = _validateLine(currentLine);

                        if (valid === undefined) {
                            console.warn(`non_supporting_type_found: ln: ${lineNum}, type: ${currentLine.type}`);
                            result[1][lineNum] = currentLine;
                        }
                        else if (!valid) {
                            tell(`invalid_csv_file: ln: ${lineNum}`);
                            return false;
                        }
                        else if (lineNum !== 1) {
                            result[0].push(currentLine);
                        }

                        lineNum++;
                        currentLine = {};
                        col = 0;

                        // if this is windows newline, skip the next character('\n')
                        if (char === '\r') {
                            i++;
                        }
                    }
                }
                else {
                    currentItem += char;
                }
            }

            // add the last item after the loop if it does not finished with new line
            if (col !== 0) {
                currentLine[headers[col]] = currentItem.trim();

                if (!_validateLine(currentLine)) {
                    tell(`invalid_csv_file: ln: ${lineNum}`);
                    return false;
                }
                else if (lineNum !== 1) {
                    result[0].push(currentLine);
                }
            }

            return result;
        },

        saveData(data, type) {

            data = data[0].map(entry => this.getPasswordData(entry, type));

            const res = [];

            const {pm, pwmh} = mega;
            for (const entry of data) {
                const name = this.getDeduplicateName(entry.name);
                res.push(pm.createItem(entry, name, pwmh));
            }

            return Promise.allSettled(res);
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

        /**
         * Processes the imported file and parses its content.
         *
         * @param {File} file The file to be processed
         * @param {Object} importBtn The button triggering the import action
         * @param {HTMLElement} errorMessage The element used to display error messages
         * @returns {Promise<Array>} A promise that resolves with the parsed data from the file
         * @throws {Error} Rejects if the file is invalid or there is an error during the file processing
         */
        processFile(file, importBtn, errorMessage) {
            return new Promise((resolve, reject) => {
                if (!file || !mega.pm.validateUserStatus()) {
                    reject('Invalid file or user status.');
                    return;
                }

                const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
                if (!isCSV) {
                    reject('Invalid file type.');
                    return;
                }

                const reader = new FileReader();

                reader.onloadstart = function() {
                    importBtn.loading = true;
                    mega.ui.pm.settings.importInFlight = true;
                    errorMessage.classList.add('hidden');
                };

                reader.onload = function(e) {
                    const text = e.target.result;
                    const data = mega.ui.pm.settings.utils.parseCSV(text, mega.ui.pm.settings.importSelected);
                    if (data && data[0].length > 0) {
                        resolve(data);
                    }
                    else {
                        mega.ui.pm.settings.importInFlight = false;
                        reject('No data found in CSV.');
                    }
                };

                reader.onerror = function() {
                    mega.ui.pm.settings.importInFlight = false;
                    reject('Error reading file.');
                };

                reader.readAsText(file);
            });
        },

        /**
         * Imports the selected file and handles the subsequent actions.
         *
         * @param {File} file The file to be imported
         * @param {Object} importBtn The button triggering the import action
         * @param {HTMLElement} errorMessage The element used to display error messages
         * @param {HTMLElement} chooseFileBtn The file selection button
         * @param {HTMLElement} importBtnText The element used to display the status of the import process
         * @param {HTMLInputElement} fileInput The input element used for file selection
         * @returns {void}
         * Handles the file processing, saving data, and updating the UI accordingly
         */
        importFile(file, importBtn, errorMessage, chooseFileBtn, importBtnText, fileInput) {
            this.processFile(file, importBtn, errorMessage)
                .then(data => this.saveImportedData(data))
                .then(res => {

                    if (res[0] === res[1]) {
                        mega.ui.toast.show(l.import_success_toast);
                    }
                    else {
                        const msg = mega.icu.format(l.pwm_settings_import_partial, res[1]);
                        errorMessage.textContent = escapeHTML(msg).replace('%1', res[0]);
                        errorMessage.classList.remove('hidden');
                        errorMessage.classList.add('warning');
                    }

                    importBtn.disabled = true;
                    importBtnText.textContent = l.import_passwords_label;
                    fileInput.value = '';
                    mega.ui.pm.settings.file = null;
                })
                .catch(() => {
                    errorMessage.textContent = l.import_fail_message;
                    errorMessage.classList.remove('hidden');
                    importBtn.disabled = false;
                    importBtn.domNode.blur();
                })
                .finally(() => {
                    chooseFileBtn.disabled = false;
                    importBtn.loading = false;
                });
        },

        /**
         * Saves the imported data to the system.
         *
         * @param {Array} data The data to be saved
         * @returns {Promise<void>} A promise that resolves when the data has been successfully saved
         * @throws {Error} Rejects if an error occurs while saving the data
         */
        saveImportedData(data) {
            if (!navigator.onLine) {
                if (!mega.ui.pm.settings.saveDataCalled) {
                    mega.ui.pm.settings.importInFlight = false;
                }
                return Promise.reject(new Error('No internet connection'));
            }

            mega.ui.pm.settings.importInFlight = true;
            mega.ui.pm.settings.saveDataCalled = true;

            const totalCount = data[0].length + Object.keys(data[1]).length;

            return mega.ui.pm.settings.utils.saveData(data, mega.ui.pm.settings.importSelected)
                .then((res) => {
                    eventlog(this.getImportEventId(mega.ui.pm.settings.importSelected));
                    const successCount = res.filter(item => item.status === 'fulfilled').length;
                    return [successCount, totalCount];
                })
                .finally(() => {
                    mega.ui.pm.settings.importInFlight = false;
                    mega.ui.pm.settings.saveDataCalled = false;
                });
        },

        /**
         * Retrieves the event ID associated with the import provider.
         *
         * @param {string} type The import provider type (e.g., 'google', 'keepass', etc.)
         * @returns {number} The event ID corresponding to the given import provider type
         */
        getImportEventId(type) {
            const eventMap = {
                'google': 500604,
                'keepass': 500605,
                'lastpass': 500606,
                'dashlane': 500607,
                '1password': 500608,
                'bitwarden': 500609,
                'nordpass': 500610,
                'proton': 500611,
                'other': 500612
            };
            return eventMap[type];
        },

        handleImportFlow(nodeID, isOffline = false) {
            if (nodeID === 'account') {
                const importBtn = pmlayout.componentSelector('.import-file');
                const errorMessage = pmlayout.querySelector('.import-error-message');
                const chooseFileBtn = pmlayout.querySelector('.choose-file');
                if (isOffline) {
                    this.handleErrorOnImportInFlight(importBtn, errorMessage, null, chooseFileBtn);
                }
                else {
                    this.handleResumeOnImportInFlight(importBtn, errorMessage);
                }
            }
            else if (mega.ui.onboarding.sheet && mega.ui.onboarding.sheet.dialog.visible) {
                const dialogNode = mega.ui.onboarding.sheet.dialog.domNode;
                const importBtn = dialogNode.componentSelector('.next-button');
                const errorMessage = dialogNode.querySelector('.main-content-div:not(.hidden) .message.error');
                const infoMessage = dialogNode.querySelector('.main-content-div:not(.hidden) .message.info');
                if (isOffline) {
                    this.handleErrorOnImportInFlight(importBtn, errorMessage, infoMessage);
                }
                else {
                    this.handleResumeOnImportInFlight(importBtn, errorMessage, infoMessage);
                }
            }
        },

        handleErrorOnImportInFlight(importBtn, errorMessage, infoMessage = null, chooseFileBtn = null) {
            if (mega.ui.pm.settings.importInFlight) {
                errorMessage.textContent = l.import_fail_message;
                errorMessage.classList.remove('hidden', 'warning');
                importBtn.loading = false;
                importBtn.disabled = false;

                if (infoMessage) {
                    infoMessage.classList.add('hidden');
                }

                if (chooseFileBtn) {
                    chooseFileBtn.disabled = false;
                }
            }
        },

        handleResumeOnImportInFlight(importBtn, errorMessage, infoMessage = null) {
            if (mega.ui.pm.settings.importInFlight) {
                errorMessage.classList.add('hidden');
                errorMessage.classList.remove('warning');
                importBtn.loading = true;

                if (infoMessage) {
                    infoMessage.classList.remove('hidden');
                }
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
