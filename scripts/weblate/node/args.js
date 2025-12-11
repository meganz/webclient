const ARGS = {
    production: false,
    language: undefined,
    update: false,
    filepath: `${__dirname}/../../../lang/strings.json`,
    clean: false,
    branch: false,
    shared: false,
    verbose: false,
    convert: false,
    forcebranch: false,
    pushmain: false,
};
const argMap = {
    '-p': '--production',
    '-u': '--update',
    '-f': '--filepath',
    '-br': '--branch',
    '-sh': '--shared',
    '-v': '--verbose',
    '-co': '--convert',
    '-fb': '--forcebranch',
    '-pm': '--pushmain',
};
for (let i = 2; i < process.argv.length; i++) {
    const operand = process.argv[i];
    const next = process.argv[i + 1];
    if (operand.startsWith('-')) {
        const flag = (argMap[operand] || operand).replace(/-/g, '');
        if (next && !next.startsWith('-')) {
            ARGS[flag] = next;
            i++;
        }
        else {
            ARGS[flag] = true;
        }
    }
}

module.exports.ARGS = ARGS;
