const path = require('path');
const fs = require('fs');
const {exec} = require('child_process');
const readline = require('readline');
module.exports = {
    readFile(filePath) {
        filePath = path.normalize(filePath);
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data);
            });
        });
    },
    writeFile(filePath, content) {
        'use strict';
        filePath = path.normalize(filePath);
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    },
    safeParse(string) {
        'use strict';
        try {
            return JSON.parse(string);
        }
        catch (ex) {
            return {};
        }
    },
    asyncExec(cmd) {
        'use strict';
        return new Promise((resolve, reject) => {
            exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    return reject({err, stderr, stdout});
                }
                if (stderr && !stdout) {
                    return reject({err, stderr, stdout});
                }
                return resolve(stdout);
            });
        });
    },
    input(query) {
        'use strict';
        return new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            rl.question(query, res => {
                resolve(res);
                rl.close();
            });
        });
    }
};
