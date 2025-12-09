const { ARGS } = require('./args.js');
const { safeParse, readFile, writeFile } = require('./utils.js');

module.exports = {
    convertToStructuredJSON(obj, asStr, source) {
        if (ARGS.verbose && ARGS.convert) {
            console.log('Converting to Structured JSON', obj);
        }
        if (typeof obj === 'string') {
            obj = safeParse(obj);
        }
        if (typeof source === 'string') {
            source = safeParse(source);
        }
        const pluralsKeys = ['zero', 'one', 'two', 'few', 'many', 'other'];
        const keys = Object.keys(obj);
        const out = {};
        for (let i = keys.length; i--;) {
            const key = keys[i];
            const val = obj[key];
            out[key] = {
                developer_comment: val.description || '',
            };
            if (Object.keys(val).length > 2 || source && source[key] && source[key].string?.includes('plural,')) {
                let content = '{count, plural,';
                for (let j = 0; j < pluralsKeys.length; j++) {
                    const part = pluralsKeys[j];
                    if (val[part]) {
                        content = `${content} ${part} {${val[part]}}`;
                    }
                }
                out[key].string = `${content}}`;
            }
            else {
                out[key].string = val.other;
            }
        }
        if (!asStr) {
            return out;
        }
        return JSON.stringify(out, undefined, 4);
    },
    convertToGoi18nv2(obj, asStr) {
        if (ARGS.verbose && ARGS.convert) {
            console.log('Converting to go-i18n-json-v2', obj);
        }
        if (typeof obj === 'string') {
            obj = safeParse(obj);
        }
        const keys = Object.keys(obj);
        const out = {};
        for (let i = keys.length; i--;) {
            const key = keys[i];
            const { string = '', developer_comment = '' } = obj[key];
            out[key] = {
                description: developer_comment,
            };
            if (string.includes('plural,')) {
                const [, str] = string.split('one {', 2);
                const [one, other] = str.split('other {', 2);
                out[key].one = one.trim().slice(0, -1);
                out[key].other = other.trim().slice(0, -2);
            }
            else {
                out[key].other = string;
            }
        }
        if (!asStr) {
            return out;
        }
        return JSON.stringify(out, undefined, 4);
    }
};

async function main() {
    const content = await readFile(ARGS.filepath);
    const str = ARGS.convert === 'go' ?
        module.exports.convertToGoi18nv2(content, true) :
        module.exports.convertToStructuredJSON(content, true);
    if (str) {
        console.log('Converted file. Re-writing...');
        return writeFile(ARGS.filepath, str);
    }
    console.error('Error: Failed to convert file.');
}

if (ARGS.filepath && ARGS.convert) {
    main().catch(ex => {
        console.error('Error: The script encountered an error:', ex.message);
        if (ARGS.verbose) {
            console.error(ex);
        }
    });
}

