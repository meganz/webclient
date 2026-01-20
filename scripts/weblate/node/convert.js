const { ARGS } = require('./args.js');
const { safeParse, readFile, writeFile } = require('./utils.js');

function escapeUnicode(str) {
    return str.replace(/[\u0080-\uFFFF]/g, (c) => {
        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
}

module.exports = {
    convertToStructuredJSON(obj, asStr, source, escaped) {
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
        const keys = Object.keys(source || obj);
        const out = {};
        for (let i = keys.length; i--;) {
            const key = keys[i];
            let val = obj[key];

            if (!val && source) {
                val = {description: source[key].description, other: source[key].string};
            }

            out[key] = {
                developer_comment: val.description || '',
            };

            if (typeof val === 'string') {
                val = {description: source[key].description, other: val};
            }

            if (val.other === '' && source) {
                val.other = source[key].string;
            }

            if (Object.keys(val).length > 2 || source && source[key] && source[key].string?.includes('plural,')) {
                let content = '{count, plural,';
                for (let j = 0; j < pluralsKeys.length; j++) {
                    const part = pluralsKeys[j];
                    if (val[part]) {
                        content = `${content} ${part} {${escaped ? escapeUnicode(val[part]) : val[part]}}`;
                    }
                }
                out[key].string = `${content}}`;
            }
            else {
                out[key].string = escaped ? escapeUnicode(val.other) : val.other;
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

