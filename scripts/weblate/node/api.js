const { safeParse } = require('./utils.js');
const { ARGS } = require('./args.js');
const { SHARED_PROJECTS } = require('./sharedConf.js');

const META_OPTS = new Set(['state', 'target', 'explanation', 'extra_flags', 'labels']);

class API {
    constructor(config) {
        this.HOST = config.BASE_URL;
        this.PROJECT = Object.values(SHARED_PROJECTS).includes(config.PROJECT) ? 'webclient' : config.PROJECT;
        this.COMPONENT = config.COMPONENT;
        this.TOKEN = config.SOURCE_TOKEN || process.env.WEBLATE_TOKEN;
        this.SHARED_PROJECT = config.SHARED;
        this.TEMPLATE_NAME = config.TEMPLATE_NAME || 'en.json';
        this.FILE_FORMAT = config.FILE_FORMAT || 'go-i18n-json-v2';
        this.MIME = config.MIME || 'application/json';

        if (
            !this.HOST
            || !this.PROJECT
            || !this.COMPONENT
            || !this.TOKEN
        ) {
            if (ARGS.verbose) {
                console.debug(`Project: ${this.PROJECT}, Shared: ${this.SHARED_PROJECT}`);
                console.debug(
                    `Host: ${this.HOST}, Component: ${this.COMPONENT}, Token: ${this.TOKEN ? this.TOKEN.length : 0}`
                );
            }
            throw new Error('Failed to initialise. Check your configuration file.');
        }

        this.fileExt = this.TEMPLATE_NAME.split('.')[1];
    }

    get headers() {
        return {
            Authorization: `Token ${this.TOKEN}`,
            Accept: 'application/json',
        };
    }

    get projectSlug() {
        return `${this.PROJECT}`;
    }

    get sharedProjectSlug() {
        return this.SHARED_PROJECT ? `${this.SHARED_PROJECT}` : false;
    }

    hasBranchComponent(branchSuffix, isShared) {
        if (!this.components) {
            throw new Error('Components have not been fetched');
        }
        return this.hasComponent(`${this.COMPONENT}-${branchSuffix}`, isShared);
    }

    hasComponent(componentName, isShared) {
        if (!this.components) {
            throw new Error('Components have not been fetched');
        }
        if (isShared) {
            const id = `${this.sharedProjectSlug}:r:${componentName}`;
            return id in this.components ? id : false;
        }
        const id = `${this.projectSlug}:r:${componentName}`;
        return id in this.components ? id : false;
    }

    hasStrings(componentId) {
        if (!this.components) {
            throw new Error('Components have not been fetched');
        }
        return this.components[componentId]?.strings > 0;
    }

    async fetchComponents() {
        if (this.components) {
            return this.components;
        }
        if (ARGS.verbose) {
            console.debug(`Fetching new components for ${this.projectSlug} and ${this.sharedProjectSlug}`);
        }
        const [ projectRes, sharedRes ] = await Promise.allSettled(
            [
                this.sendRequest(`projects/${this.projectSlug}/components`),
                this.sharedProjectSlug ? this.sendRequest(`projects/${this.sharedProjectSlug}/components/`) : Promise.resolve(),
            ]
        );
        if (!projectRes.value || !projectRes.value.results || this.sharedProjectSlug && (!sharedRes.value || !sharedRes.value.results)) {
            throw new Error('Invalid API response from Weblate');
        }
        await this.storeComponents(projectRes.value.results);
        if (sharedRes.value) {
            await this.storeComponents(sharedRes.value.results, true);
        }

        if (ARGS.verbose) {
            console.debug(`Fetched ${Object.keys(this.components).length} components`);
        }
        return this.components;
    }

    async storeComponents(res, isShared) {
        this.components = this.components || {};
        const promises = [];
        for (let i = res.length; i--;) {
            const { slug, name } = res[i];
            if (slug !== 'glossary') {
                const id = `${isShared ? this.sharedProjectSlug : this.projectSlug}:r:${slug}`;
                this.components[id] = {
                    name,
                };
                promises.push(
                    this.sendRequest(`components/${isShared ? this.sharedProjectSlug : this.projectSlug}/${slug}/statistics/`)
                        .then(({results}) => {
                            this.components[id].strings = results && results[0] && results[0].total || 0;
                        })
                );
            }

        }
        return Promise.allSettled(promises);
    }

    async fetchTagFilteredComponents(tag) {
        if (!this.components) {
            await this.fetchComponents();
        }
        if (!this.labels) {
            await this.fetchLabels();
        }
        if (ARGS.verbose) {
            console.debug(`Fetching components with strings tagged ${tag}`);
        }
        tag = this.labels[this.projectSlug][tag];
        if (!tag) {
            console.error('Error: Unable to fetch components with the specified tag to include in the build');
            return [];
        }
        const promises = [];
        for (const id of Object.keys(this.components)) {
            if (!id.endsWith(`:r:${this.COMPONENT}`)) {
                promises.push(this.fetchAllComponentStringMeta(...id.split(':r:').reverse()));
            }
        }
        await Promise.allSettled(promises);
        const components = new Set();
        for (const string of Object.values(this.stringsMeta)) {
            if (!components.has(string.componentId) && string.labels && string.labels.some(l => l.id === tag)) {
                components.add(string.componentId);
            }
        }
        if (ARGS.verbose) {
            console.debug(`Found ${components.size} components with tagged strings`);
        }
        return [...components];
    }

    async fetchLanguages() {
        if (this.languages) {
            return this.languages;
        }
        if (ARGS.verbose) {
            console.debug(`Fetching new languages for ${this.projectSlug}`);
        }
        // Note: Assumes that the languages in both projects are the same.
        const res = await this.sendRequest(`components/${this.projectSlug}/${this.COMPONENT}/translations/`);
        if (!res.results) {
            throw new Error('Invalid API response from Weblate');
        }
        this.languages = {};
        for (let i = res.results.length; i--;) {
            const { language } = res.results[i];
            if (!ARGS.lang || ARGS.lang.split(',').includes(language.code)) {
                this.languages[language.code] = language;
            }
        }
        if (ARGS.verbose) {
            console.debug(`Fetched ${Object.keys(this.languages).length} language(s)`);
        }
        return this.languages;
    }

    async fetchComponentTranslatedLanguages(branchComponentId, projectId) {
        projectId = projectId || this.projectSlug;
        if (branchComponentId === this.COMPONENT && projectId === this.projectSlug) {
            const languages = {...(this.languages || await this.fetchLanguages())};
            delete languages.en;
            return languages;
        }
        const res = await this.sendRequest(`components/${projectId}/${branchComponentId}/translations/`);
        if (!res.results) {
            throw new Error('Invalid API response from Weblate');
        }
        const languages = {};
        for (let i = res.results.length; i--;) {
            const { language } = res.results[i];
            if (language.code !== 'en') {
                languages[language.code] = language;
            }
        }
        if (ARGS.verbose) {
            console.debug(`Fetched ${res.results.length} languages`);
        }
        return languages;
    }

    async createComponent(name, fileContent, projectId) {
        const formData = new FormData();
        const buffer = Buffer.from(fileContent);
        formData.append('docfile', new File([buffer], this.TEMPLATE_NAME, { type: this.MIME }));
        formData.append('name', name);
        formData.append('slug', name);
        formData.append('source_language', 'en');
        formData.append('new_lang', 'add');
        formData.append('file_format', this.FILE_FORMAT);
        formData.append('filemask', `${name}/*${this.fileExt}`);
        formData.append('template', `${name}/${this.TEMPLATE_NAME}`);
        formData.append('new_base', `${name}/${this.TEMPLATE_NAME}`);
        formData.append('edit_template', 'on');
        formData.append('priority', '100');
        formData.append('is_glossary', 'false');
        projectId = projectId || this.projectSlug;
        if (ARGS.verbose) {
            console.debug('Creating new component', name, projectId);
        }
        const data = await this.sendRequest(`projects/${projectId}/components/`, { formData });
        if (!data.id) {
            const { errors, type } = safeParse(data);
            console.error('Error: Failed to initialise branch component', type || data);
            if (errors) {
                this.logErrorObject(errors);
            }
            return false;
        }
        if (this.components) {
            const componentData = await this.sendRequest(`components/${projectId}/${name}/statistics/`);
            this.components[`${projectId}:r:${name}`] = {
                name,
                strings: componentData?.results?.[0]?.total || 0,
            };
        }
        if (ARGS.verbose) {
            console.debug('New component created', data.id, name);
        }
        return data;
    }

    async componentPutEnglish(componentId, content, projectId) {
        if (typeof content !== 'string') {
            throw new Error('Invalid content format to upload');
        }
        const buffer= Buffer.from(content)
        const formData = new FormData();
        formData.append('file', new File([buffer], this.TEMPLATE_NAME, { type: this.MIME }));
        formData.append('method', 'replace');
        formData.append('fuzzy', 'process');
        formData.append('conflicts', 'replace-approved');
        projectId = projectId || this.projectSlug;
        if (ARGS.verbose) {
            console.debug(`Uploading strings to ${componentId} in ${projectId}`);
        }
        const res = await this.sendRequest(`translations/${projectId}/${componentId}/en/file/`, { formData });
        if (!res.count) {
            const { errors, type } = safeParse(res);
            console.error('Error: Failed to upload file', type || res);
            this.logErrorObject(errors);
            return false;
        }

        if (this.components) {
            const componentData = await this.sendRequest(`components/${projectId}/${componentId}/statistics/`);
            this.components[`${projectId}:r:${componentId}`] = {
                name: componentId,
                strings: componentData?.results?.[0]?.total || 0,
            };
        }
        return res;
    }

    async componentGetEnglish(componentId, projectId) {
        if (ARGS.verbose) {
            console.debug(`Fetching en strings for ${componentId}`);
        }
        return this.componentGetLanguage(componentId, 'en', projectId);
    }

    async componentGetLanguage(componentId, languageId, projectId) {
        projectId = projectId || this.projectSlug;
        if (ARGS.verbose) {
            console.debug(`Fetching ${languageId} translations for ${componentId} in ${projectId}`);
        }
        const res = await this.sendRequest(`translations/${projectId}/${componentId}/${languageId}/file/`);
        if (!res) {
            throw new Error('Invalid API response from Weblate');
        }
        if (ARGS.verbose) {
            console.debug(`Fetching ${languageId} translations finished for ${componentId} in ${projectId}`);
        }
        return res;
    }

    async fetchAllComponentStringMeta(componentId, projectId) {
        if (!this.stringsMeta) {
            this.stringsMeta = {};
        }
        if (componentId in this.stringsMeta) {
            return this.stringsMeta;
        }
        projectId = projectId || this.projectSlug;
        if (ARGS.verbose) {
            console.debug('Fetching new component string meta', componentId, projectId);
        }
        this.stringsMeta[componentId] = true;
        let link = `translations/${projectId}/${componentId}/en/units/?page_size=1000`;
        do {
            const res = await this.sendRequest(link);
            if (res.results) {
                for (const stringMeta of res.results) {
                    stringMeta.componentId = componentId;
                    stringMeta.projectId = projectId;
                    this.stringsMeta[stringMeta.id] = stringMeta;
                }
            }
            else {
                return false;
            }
            link = res.next;
        } while (link);
        return this.stringsMeta;
    }

    async fetchStringMeta(stringKey, componentId, projectId) {
        if (!componentId) {
            throw new Error('Invalid component id for strings meta fetch');
        }
        projectId = projectId || this.projectSlug;
        if (!this.stringsMeta) {
            const res = await this.fetchAllComponentStringMeta(componentId, projectId);
            if (!res) {
                return false;
            }
        }
        if (stringKey in this.stringsMeta) {
            return this.stringsMeta[stringKey];
        }
        for (const string of Object.values(this.stringsMeta)) {
            if (
                string.projectId === projectId &&
                string.componentId === componentId &&
                string.context === stringKey
            ) {
                return string;
            }
        }
        return false;
    }

    async updateStringMeta(attributes, stringId) {
        if (!Object.keys(attributes).length) {
            throw new Error('Invalid attributes for string update');
        }
        const formData = {};
        const keys = Object.keys(attributes);
        let some = false;
        for (let i = keys.length; i--;) {
            if (META_OPTS.has(keys[i])) {
                formData[keys[i]] = attributes[keys[i]];
                some = true;
            }
        }
        if (!some) {
            console.warn('Invalid meta update', keys, stringId);
            return false;
        }

        const res = await this.sendRequest(`units/${stringId}`, { formData, method: 'PATCH' });
        if (!res || typeof res === 'string') {
            const { errors, type } = safeParse(res);
            console.error('Error: Failed to update metadata', type || res, stringId);
            this.logErrorObject(errors);

            return false;
        }
        delete this.stringsMeta[stringId];
        const meta = await this.sendRequest(`units/${stringId}`);
        if (!meta) {
            console.error(`Error: Failed to fetch updated metadata for ${stringId}`);

            return true;
        }
        this.stringsMeta[stringId] = meta;
        return true;
    }

    async fetchLabels(projectId) {
        projectId = projectId || this.projectSlug;
        if (!this.labels) {
            this.labels = {};
        }
        if (this.labels[projectId]) {
            return this.labels[projectId];
        }

        const res = await this.sendRequest(`projects/${projectId}/labels/`);
        if (!res || !res.results) {
            console.error('Error: Failed to retrieve label ids');
            return false;
        }
        this.labels[projectId] = {};
        for (let i = res.results.length; i--;) {
            const { name, id } = res.results[i];
            this.labels[projectId][name] = id;
        }
        return this.labels[projectId];
    }

    async sendRequest(endpoint, reqOptions = {}) {
        const { payload = null, formData = null, method = 'GET' } = reqOptions;
        if (!endpoint.startsWith('http')) {
            endpoint = `${this.HOST}/${endpoint}`;
        }
        if (!endpoint.endsWith('/') && !endpoint.includes('?')) {
            endpoint = `${endpoint}/`;
        }
        const options = {
            headers: this.headers,
            method,
        };
        if (payload) {
            options.body = JSON.stringify(payload);
            options.headers['Content-Type'] = 'application/json';
        }
        if (formData) {
            options.body = formData;
        }
        if ((payload || formData) && method === 'GET') {
            options.method = 'POST';
        }
        if (ARGS.verbose) {
            console.debug(`${options.method}ing:`, endpoint, payload ? JSON.stringify(payload, null, 2) : formData ? JSON.stringify([...formData.entries()]) : '');
        }
        const res = await fetch(endpoint, options);
        if (res.status < 200 || res.status > 399) {
            if (res.status === 401 || res.status === 403 || res.status > 499) {
                console.error(res);
                throw new Error(`${res.status} ${res.statusText} (${await res.text()})`);
            }
            return res.text();
        }
        return res.json();
    }

    logErrorObject(errors) {
        if (!Array.isArray(errors) || !errors.length) {
            return;
        }
        for (const err of errors) {
            console.error('Error', err.title || err.code || 'Unknown');
            console.error('Details', err.detail || 'Unknown');
            console.error('Attribute', err.attr || 'Unknown');
        }
    }
}

let api
module.exports.API = (config) => {
    api = api || new API(config);
    return api;
};
