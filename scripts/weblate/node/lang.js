const { API } = require('./api.js');
const { readFile, writeFile, safeParse, asyncExec, input } = require('./utils.js');
const { ARGS } = require('./args.js');
const { SHARED_PROJECTS } = require('./sharedConf.js');
const { convertToStructuredJSON, convertToGoi18nv2 } = require('./convert.js');

let api;

function sanitiseString(string, convertQuotes, escapeTag) {
    'use strict';
    if (!string) {
        return '';
    }
    const tags = [...string.matchAll(/<[^sd][^>]*>/g)];
    let tagCounter = 0;
    for (const tag of tags) {
        string = string.replace(tag[0], `@@@tag${tagCounter++}@@@`);
    }

    const regexps = [
        /\.{3}/g,
    ];
    const replacements = [
        '\u8230'
    ];
    if (convertQuotes) {
        regexps.push(
            /"(.+)"/g,
            /(\W)'(._)'/g,
            /(\w)'/g
        );
        replacements.push(
            '\u201c$1\u201d',
            '$1\u2018$2\u2019',
            '$1\u2019'
        );
    }

    for (let i = 0; i < regexps.length; i++) {
        string = string.replace(regexps[i], replacements[i]);
    }

    tagCounter = 0;
    for (const tag of tags) {
        string = string.replace(`@@@tag${tagCounter++}@@@`, tag[0]);
    }

    if (escapeTag) {
        string = string.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return string;
}

async function validateStrings(content, enStrings) {
    'use strict';
    const jiraRegex = /^[A-Z]{2,4}-\d+:/;
    for (const [key, value] of Object.entries(content)) {
        if (!value.hasOwnProperty('string')) {
            console.error(`Error: String with key ${key} has no string.`);
            delete content[key];
        }
        else if (!value.hasOwnProperty('developer_comment')) {
            console.error(`Error: String with key ${key} has no developer comment.`);
            delete content[key];
        }
        else if (key.trim() === '') {
            console.error('Error: A string key is empty');
            delete content[key];
        }
        else if (value.string.trim() === '' && value.developer_comment.trim() !== '') {
            console.error(`Error: String with key ${key} has no string content`);
            delete content[key];
        }
        else if (value.developer_comment.length && !jiraRegex.test(value.developer_comment)) {
            console.error(`Error: Developer comment for string with key ${key} does not start with a JIRA ticket id`);
            console.error('e.g: WEB-16334: Comment content.');
            delete content[key];
        }
        else {
            const sanitised = sanitiseString(value.string, true);
            let keep = true;
            if (sanitised) {
                for (const [enKey, enValue] of Object.entries(enStrings)) {
                    if (enValue.string === sanitised) {
                        console.log(
                            `WARNING: A string with the same content as ${key} already exists: ${enKey} = ${sanitised}`
                        );
                        console.log('If the string has the same context consider using it instead.');
                        const res = await input('Do you want to add a duplicate? (Y/N): ');
                        keep = String(res).toLowerCase().startsWith('y');
                    }
                    if (!keep) {
                        break;
                    }
                }
            }
            if (keep) {
                content[key].string = sanitised;
                console.log(`Accepted: String with key ${key} is valid`);
            }
            else {
                delete content[key];
            }
        }
    }
    return content;
}

async function verifyAdditionalBranch(branchSuffix) {
    'use strict';
    if (!ARGS.branch) {
        return false;
    }
    const branch = ARGS.branch.replace(/[^A-Za-z0-9]+/g, '').toLowerCase();
    if (['master', 'main', 'develop', branchSuffix].includes(branch)) {
        console.warn('Specified component is already included in the language files');
        return false;
    }
    const extraBranchRes = await api.hasBranchComponent(branch, true);
    if (!extraBranchRes) {
        console.error(`Error: Could not locate additional branch component: ${branch}`);
        return false;
    }
    return branch;
}

function getLanguageKeys() {
    'use strict';
    const { languages } = api;
    if (!languages) {
        throw new Error('Language keys require the languages to be fetched via API->fetchLanguages');
    }
    const remaps = {
        pt: 'br',
        ja: 'jp',
        zh_Hans: 'cn',
        zh_Hant: 'ct',
        ko: 'kr'
    };
    const data = {};
    for (const key of Object.keys(languages)) {
        data[remaps[key] || key] = key;
    }
    return data;
}

async function filterSharedStrings(sharedData, sharedComponentId, sharedTag) {
    'use strict';
    if (!sharedTag) {
        return {};
    }
    const labelData = await api.fetchLabels();
    if (!labelData) {
        console.error('Error: Cannot filter strings without label data. Skipping all');
        return {};
    }
    sharedTag = labelData[sharedTag];
    if (!sharedTag) {
        console.error(`Error: Invalid label to filter by. Available ${JSON.stringify(Object.keys(labelData))}`);
        return {};
    }
    if (!sharedData.en) {
        return {};
    }
    const filteredStrings = {};
    const sharedKeys = [];
    for (const key of Object.keys(sharedData.en)) {
        const meta = await api.fetchStringMeta(key, sharedComponentId);
        if (meta?.labels && meta.labels.some(l => l.id === sharedTag)) {
            sharedKeys.push(key);
        }
    }
    for (const [langKey, langData] of Object.entries(sharedData)) {
        filteredStrings[langKey] = {};
        for (const [ key, stringData ] of Object.entries(langData)) {
            if (sharedKeys.includes(key)) {
                filteredStrings[langKey][key] = stringData;
            }
        }
    }
    return filteredStrings;
}

function prepareComponents(langKeys, sharedProd, sharedBranch, baseProd, baseBranch, extraBranch, buildComponents) {
    'use strict';
    const mergedFiles = {};
    langKeys = Object.keys(langKeys);
    // English first
    langKeys.splice(langKeys.indexOf('en'), 1);
    langKeys.unshift('en');
    // Merge as base project prod <- base project branch <- extra branch <- shared project prod <- shared project branch
    //  <- buildComponents
    for (const lang of langKeys) {
        if (sharedBranch[lang]) {
            Object.assign(sharedProd[lang], sharedBranch[lang]);
        }
        const content = baseBranch[lang] ? Object.assign(baseProd[lang], baseBranch[lang]) : baseProd[lang];
        if (extraBranch[lang]) {
            Object.assign(content, extraBranch[lang]);
        }
        mergedFiles[lang] = Object.assign(content, sharedProd[lang]);
        for (const component of Object.values(buildComponents)) {
            Object.assign(mergedFiles[lang], component[lang]);
        }
        // Sanitise and replace empty translations
        for (const [key, data] of Object.entries(mergedFiles[lang])) {
            mergedFiles[lang][key] = sanitiseString(data.string, lang === 'en', true);
            if (lang !== 'en' && !mergedFiles[lang][key]) {
                mergedFiles[lang][key] = mergedFiles.en[key];
            }
        }
    }
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const sorted = Object.keys(mergedFiles.en).sort(collator.compare);
    for (const lang of langKeys) {
        mergedFiles[lang] = JSON.stringify(mergedFiles[lang], sorted, 4);
    }
    return mergedFiles;
}

function processCharLimits(uploadStrings) {
    const charLimits = {};
    let hasLimits = false;
    for (const [key, value] of Object.entries(uploadStrings)) {
        if (value.hasOwnProperty('char_limit')) {
            if (value.char_limit > 0) {
                charLimits[key] = value.char_limit;
                hasLimits = true;
            }
            delete uploadStrings[key].char_limit;
        }
    }
    return { hasLimits, charLimits };
}

async function doUploadMetaUpdates(componentId, hasLimits, sharedTag, isShared, uploadStrings, charLimits) {
    const labels = [];
    if (ARGS.shared && ARGS.update !== ARGS.shared) {
        const labelData = await api.fetchLabels();
        if (labelData) {
            if (labelData.shared_string) {
                labels.push(labelData.shared_string);
            }
            if (labelData[sharedTag]) {
                labels.push(labelData[sharedTag]);
            }
        }
    }
    if (!labels.length && !hasLimits) {
        return true;
    }
    const stringMeta = await api.fetchAllComponentStringMeta(componentId, isShared);
    if (!stringMeta) {
        console.error('Error: Failed to fetch strings metadata');
        return false;
    }
    console.log('Updating string metadata');
    const metaPromises = [];
    for (const [stringId, meta] of Object.entries(stringMeta)) {
        if (meta.context in uploadStrings) {
            const metaUpdate = {
                labels,
            };
            if (meta.context in charLimits) {
                metaUpdate.extra_flags = `max-length:${charLimits[meta.context]}`;
            }
            metaPromises.push(api.updateStringMeta(metaUpdate, stringId));
        }
    }
    return Promise.allSettled(metaPromises);
}

async function uploadMain(prodStrings, sharedTag) {
    'use strict';

    const fileContent = await readFile(ARGS.filepath);
    const uploadStrings = await validateStrings(safeParse(fileContent), prodStrings);
    if (Object.keys(uploadStrings).length === 0) {
        console.error('Error: Invalid new strings');
        return false;
    }
    const { hasLimits, charLimits } = processCharLimits(uploadStrings);
    console.log('New strings are valid! :)');
    console.log('Uploading directly to main component');
    const isShared = sharedTag && ARGS.update === sharedTag ? api.sharedProjectSlug : api.projectSlug;

    prodStrings = Object.assign({}, prodStrings, uploadStrings);
    for (const [key, value] of Object.entries(prodStrings)) {
        if (value.string === '' && value.developer_comment === '') {
            delete prodStrings[key];
        }
    }
    if (Object.keys(prodStrings).length === 0) {
        console.error('Error: Cannot upload an empty strings file');
        return false;
    }
    prodStrings = convertToGoi18nv2(prodStrings, true);
    console.log('Pushing new strings to component file...');
    const res = await api.componentPutEnglish(api.COMPONENT, prodStrings, isShared);
    if (!res || !res.accepted) {
        console.error('Error: Uploading to existing branch component failed');
        return false;
    }
    return doUploadMetaUpdates(api.COMPONENT, hasLimits, sharedTag, isShared, uploadStrings, charLimits);
}

async function upload(branchSuffix, webProdStrings, sharedTag) {
    'use strict';
    if (!branchSuffix || ['develop', 'master', 'main'].includes(branchSuffix)) {
        console.error('Error: Invalid branch to upload on.', branchSuffix);
        return false;
    }
    const fileContent = await readFile(ARGS.filepath);
    const uploadStrings = await validateStrings(safeParse(fileContent), webProdStrings);
    if (Object.keys(uploadStrings).length === 0) {
        console.error('Error: Invalid new strings');
        return false;
    }
    const { hasLimits, charLimits } = processCharLimits(uploadStrings);
    console.log('New strings are valid! :)');
    const isShared = sharedTag && ARGS.update === sharedTag ? api.sharedProjectSlug : api.projectSlug;

    let existingStrings = {};
    const branchId = api.hasBranchComponent(branchSuffix, isShared === api.sharedProjectSlug);
    if (branchId && api.hasStrings(branchId)) {
        console.log('Downloading latest branch component strings...');
        existingStrings = await api.componentGetEnglish(`${api.COMPONENT}-${branchSuffix}`, isShared);
        if (!existingStrings) {
            console.error('Error: Failed to download existing branch content');
            return false;
        }
        existingStrings = convertToStructuredJSON(existingStrings);
    }
    existingStrings = Object.assign(existingStrings, uploadStrings);
    for (const [key, value] of Object.entries(existingStrings)) {
        if (value.string === '' && value.developer_comment === '') {
            delete existingStrings[key];
        }
    }
    if (Object.keys(existingStrings).length === 0) {
        console.error('Error: Cannot upload an empty strings file');
        return false;
    }
    existingStrings = convertToGoi18nv2(existingStrings, true);
    console.log('Pushing new strings to branch component file...');
    if (branchId) {
        const res = await api.componentPutEnglish(`${api.COMPONENT}-${branchSuffix}`, existingStrings, isShared);
        if (!res || !res.accepted) {
            console.error('Error: Uploading to existing branch component failed');
            return false;
        }
    }
    else {
        const res = await api.createComponent(`${api.COMPONENT}-${branchSuffix}`, existingStrings, isShared);
        if (!res) {
            console.error('Error: Creating branch component failed');
            return false;
        }
    }
    return doUploadMetaUpdates(`${api.COMPONENT}-${branchSuffix}`, hasLimits, sharedTag, isShared, uploadStrings, charLimits);
}

async function componentDownload(id, target, langKeys) {
    let [projectId, componentId] = id.split(':r:');
    projectId = projectId || api.projectSlug;
    if (!componentId) {
        throw new Error(`Invalid component download found ${id}`);
    }
    const promises = [];
    const langs = await api.fetchComponentTranslatedLanguages(componentId, projectId);
    target.en = await api.componentGetEnglish(componentId, projectId)
        .then(res => {
            return convertToStructuredJSON(res);
        });
    for (const [langCode, langId] of Object.entries(langKeys)) {
        if (langId !== 'en') {
            if (langs[langId]) {
                promises.push(
                    api.componentGetLanguage(componentId, langId, projectId)
                        .then(res => {
                            target[langCode] = convertToStructuredJSON(res, false, target.en);
                        })
                );
            }
            else {
                promises.push(
                    Promise.resolve(() => {
                        target[langCode] = {...target.en};
                    })
                );
            }
        }
    }
    return Promise.allSettled(promises);
}

async function download(branchSuffix, webProdStrings, sharedTag, build) {
    'use strict';
    let promises = [];
    const baseProd = api.hasComponent(api.COMPONENT, !!ARGS.shared);
    const baseBranch = api.hasBranchComponent(branchSuffix, !!ARGS.shared);
    const sharedBranch = api.hasBranchComponent(branchSuffix);
    const extraBranch = ARGS.branch ? api.hasBranchComponent(ARGS.branch, !!ARGS.shared) : false;
    promises.push(api.fetchAllComponentStringMeta(api.COMPONENT));

    const langKeys = getLanguageKeys();
    const baseProdLangs = {};
    const baseBranchLangs = {};
    const sharedProdLangs = {
        en: webProdStrings
    };
    const sharedBranchLangs = {};
    const extraBranchLangs = {};
    const buildLangs = {};

    console.log('Fetching Main Language Files');
    if (baseProd && api.hasStrings(baseProd)) {
        promises.push(componentDownload(baseProd, baseProdLangs, langKeys));
    }

    if (baseBranch && api.hasStrings(baseBranch)) {
        console.log('Fetching Branch Language Files...');
        promises.push(componentDownload(baseBranch, baseBranchLangs, langKeys));
    }

    if (sharedTag && sharedBranch && api.hasStrings(sharedBranch)) {
        console.log('Fetching Shared Branch Language Files...');
        promises.push(componentDownload(sharedBranch, sharedBranchLangs, langKeys));
    }

    if (extraBranch && api.hasStrings(extraBranch)) {
        console.log('Fetching additional specified component');
        promises.push(componentDownload(extraBranch, extraBranchLangs, langKeys));
    }

    for (const [langCode, langId] of Object.entries(langKeys)) {
        promises.push(
            api.componentGetLanguage(api.COMPONENT, langId)
                .then(res => {
                    sharedProdLangs[langCode] = convertToStructuredJSON(res, false, webProdStrings);
                })
        );
    }

    if (build && build.length) {
        const fetched = new Set([baseBranch, sharedBranch, extraBranch]);
        for (const id of build) {
            if (id && !fetched.has(id) && api.hasStrings(`${api.projectSlug}:r:${id}`)) {
                buildLangs[id] = {};
                promises.push(componentDownload(`${api.projectSlug}:r:${id}`, buildLangs[id], langKeys))
            }
        }
        console.log(`Build mode fetching additional ${Object.keys(buildLangs).length} branches`);
    }

    await Promise.allSettled(promises);
    const sharedStrings = await filterSharedStrings(sharedProdLangs, api.COMPONENT, sharedTag);
    const sharedBranchStrings = await filterSharedStrings(sharedBranchLangs, api.COMPONENT, sharedTag);
    if (Object.keys(buildLangs).length) {
        const filterPromises = [];
        for (const [id, component] of Object.entries(buildLangs)) {
            filterPromises.push(filterSharedStrings(component, id, sharedTag).then(res => {
                buildLangs[id] = res;
            }));
        }
        await Promise.allSettled(filterPromises);
    }
    const componentFiles = prepareComponents(
        langKeys,
        sharedStrings,
        sharedBranchStrings,
        baseProdLangs,
        baseBranchLangs,
        extraBranchLangs,
        buildLangs
    );
    promises = [];
    console.log('Creating Translation Files...');
    for (const [lang, fileContent] of Object.entries(componentFiles)) {
        promises.push(
            writeFile(`${__dirname}/../../../lang/${lang}${ARGS.production && !ARGS.shared ? '_prod' : ''}.json`, fileContent)
        );
    }
    return Promise.allSettled(promises);
}

async function main() {
    'use strict';
    console.log('--- Weblate Language Management ---');
    if (ARGS.shared && !(String(ARGS.shared).toLowerCase() in SHARED_PROJECTS)) {
        throw new Error(`Invalid shared project. Expected one of: ${Object.keys(SHARED_PROJECTS).join(', ')}`);
    }
    const configFile = await readFile(`${__dirname}/../translate.json`).catch(() => {
        console.warn('Trying sample config');
        return readFile(`${__dirname}/../translate.json.example`);
    });
    const config = safeParse(configFile);
    const sharedTag = ARGS.shared ? String(ARGS.shared).toLowerCase() : undefined;
    config.SHARED = SHARED_PROJECTS[sharedTag];
    api = API(config);

    const [ branchRes, prodRes, languagesRes ] = await Promise.allSettled([
        typeof ARGS.forcebranch === 'string' ? Promise.resolve(ARGS.forcebranch) : asyncExec('git symbolic-ref --short -q HEAD'),
        api.componentGetEnglish(api.COMPONENT).then(res => {
            return convertToStructuredJSON(res);
        }),
        api.fetchLanguages(),
        api.fetchComponents(),
    ]);
    if (ARGS.pushmain) {
        // Allow uploading in this case regardless of branch being valid or even existing
        branchRes.value = 'main';
    }
    if (!branchRes.value || !branchRes.value.trim()) {
        console.error('Error: Failed to retrieve your current git branch.');
        return false;
    }
    if (!prodRes.value || !Object.keys(prodRes.value).length) {
        console.error('Error: Failed to download the prod component');
        return false;
    }
    if (!languagesRes.value) {
        console.error('Error: Failed to fetch project languages');
        return false;
    }

    const branchSuffix = branchRes.value.replace(/[^A-Za-z0-9]+/g, '').toLowerCase();
    if (ARGS.update) {
        console.log('~ Import started ~');
        if (ARGS.pushmain) {
            await uploadMain(prodRes.value, sharedTag);
        }
        else {
            await upload(branchSuffix, prodRes.value, sharedTag);
        }
        console.log('Completed');
        console.log('~ Import completed ~');
    }

    let build = ARGS.shared && ARGS.production;
    if (build) {
        build = await api.fetchTagFilteredComponents(sharedTag);
    }
    console.log('~ Export started ~');
    ARGS.branch = await verifyAdditionalBranch(branchSuffix);
    await download(branchSuffix, prodRes.value, sharedTag, build);
    console.log('Completed');
    console.log('~ Export completed ~');
}

main().catch(ex => {
    'use strict';
    console.error('Error: The script encountered an error:', ex.message);
    if (ARGS.verbose) {
        console.error(ex);
    }
    process.exitCode = 1;
});
