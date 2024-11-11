var fileLimit = 512*1024;

const fs = require('fs');
const path = require("path");

const cwd = process.cwd();
const debug = process.env.DEBUG;
const basename = p => p.replace(/\\+/g, '/').replace(/^.*\//, '');

const rebaseURLs = true;
const usePostCSS = true;
const usePostHTML = true;
const useEmbedMode = !!process.env.EMBEDMODE;
const useImageryMode = !useEmbedMode && !process.env.NOIMAGERY && process.env.USER !== 'jenkins' || process.env.IMAGERY;

const TARGET = 'build';
const getBuildFile = (file) => path.join(TARGET, file);
const getCleanFile = (file) => file.replace(cwd, '').replace(/[\\\/]+/g, '/').replace(TARGET, '').replace(/^\W+/, '');

class FS {
    static ls(dir, regex = false, result = []) {
        const files = fs.readdirSync(dir);

        for (let i = files.length; i--;) {
            const file = path.join(dir, files[i]);

            if (this.isDir(file)) {
                result = this.ls(file, regex, result);
            }
            else if (!regex || regex.test(file)) {
                result.push(file);
            }
        }
        return result;
    }

    static rm(path) {
        if (!path.includes(cwd) || path.replace(cwd, '').length < 5) {
            throw new Error(`Potentially unexpected removal... ${path}`);
        }
        if (debug) {
            console.log(`INFO: Removing ${path}`);
        }
        return fs.rmSync(path, {recursive: true, force: true});
    }

    static mkdir(...paths) {
        return fs.mkdirSync(path.join(...paths), {recursive: true});
    }

    static stat(path) {
        try {
            return fs.statSync(path);
        }
        catch (ex) {}
        return false;
    }

    static isDir(path) {
        const s = this.stat(path);
        return s && s.isDirectory();
    }
}

var Secureboot = function() {
    var content = fs.readFileSync("secureboot.js").toString().split("\n");
    var jsl = getFiles();
    var ns  = {};
    var jsl3;

    function getWeight(filename) {
        return Math.round((fs.statSync(filename)['size']/fileLimit)*30);
    }

    function die() {
        console.error.apply(console, arguments);
        process.exit(1);
    }

    function getFiles() {
        var jsl   = [];
        var begin = false;
        var lines = [];
        for (var i in content) {
            var line = content[i];
            if (line.match(/jsl\.push.+(html|js)/)) {
                begin = true;
            } else if (line.match(/var.+jsl2/)) {
                break;
            }
            if (begin) {
                if (line.trim().match(/^(\}.+)?(if|else)/)) {
                    /* We must break the group, there is an if */
                    if (line.trim().match(/^if/)) {
                        lines.push('jsl.push({f:"\0.jsx"})');
                    }
                    line = line.replace(/else(\s*if)?/, 'if (true)');
                    line = line.replace(/\(.+\)/, '(true)');
                }
                lines.push(line.replace('jsl =', 'z$&'));
                // detect any } OR } // comment to break the current group
                if (line.trim()[0] == "}") {
                    lines.push('jsl.push({f:"\0.jsx"})');
                }
            }
        }
        var langFilepath = '';
        var is_chrome_firefox = 0;
        var is_mobile = 0;

        eval(lines.join("\n"));
        return jsl;
    };

    ns.addHeader = function(lines, files) {
        lines.push("    /* Bundle Includes:");
        files.forEach(function(file) {
            lines.push(`     *   ${getCleanFile(file)}`);
        });
        lines.push("     */");
    }

    ns.rewrite = function(name) {
        var addedHtml = false;
        var lines = [];
        var errors = [];
        var jsgroup = [];
        var cssgroup = [];
        var seenFiles = {};
        var section = false;
        var bundleFiles = [];
        var outOfBundle = [];
        var watchSeenFiles = true;
        var jsGroups = this.getJSGroups();
        var jsKeys   = Object.keys(jsGroups);
        var cssGroups = this.getCSSGroups();
        var cssKeys   = Object.keys(cssGroups);
        var allowExtraHTML = false;
        for (var i = 0, l = content.length; i < l; ++i) {
            if (!section) {
                if (content[i].indexOf('var jsl = []') > 0) {
                    section = 'main';
                }
                else {
                    lines.push(content[i]);
                    continue;
                }
            }
            var file = null;
            if (content[i].match(/jsl\.push.+(js)/)) {
                file = content[i].match(/'.+\.(js)'/);
                if (!file) {
                    lines.push(content[i]);
                    continue;
                }
                file = file[0].substr(1, file[0].length - 2);
                if (file === 'js/staticPages.js') {
                    allowExtraHTML = true;
                }
                if (jsGroups[jsKeys[0]] && jsGroups[jsKeys[0]][0] == file) {
                    ns.addHeader(lines, jsGroups[jsKeys[0]]);
                    lines.push("    jsl.push({f:'" + jsKeys[0] + "', n: '" + jsKeys[0].replace(/[^a-z0-9]/ig, "-") + "', j: 1, w: " + getWeight(jsKeys[0]) + "});");
                    bundleFiles.push(jsKeys[0]);
                    jsgroup = jsGroups[jsKeys.shift()];
                } else if (jsgroup.indexOf(file) == -1) {
                    outOfBundle.push(content[i]);
                    lines.push(content[i]);
                }
            } else if (content[i].match(/jsl\.push.+(css)/)) {
                file = content[i].match(/'.+\.(css)'/);
                if (!file) {
                    lines.push(content[i]);
                    continue;
                }
                file = file[0].substr(1, file[0].length - 2);
                if (usePostCSS) {
                    file = getBuildFile(file);
                }
                if (cssGroups[cssKeys[0]] && cssGroups[cssKeys[0]][0] == file) {
                    ns.addHeader(lines, cssGroups[cssKeys[0]]);
                    lines.push("    jsl.push({f:'" + cssKeys[0] + "', n: '" + cssKeys[0].replace(/[^a-z0-9]/ig, "-") + "', j: 2, w: " + getWeight(cssKeys[0]) + "});");
                    bundleFiles.push(cssKeys[0]);
                    cssgroup = cssGroups[cssKeys.shift()];
                } else if (cssgroup.indexOf(file) == -1) {
                    outOfBundle.push(content[i]);
                    lines.push(content[i]);
                }
            } else if (content[i].match(/jsl\.push.+html/) && content[i].indexOf('embedplayer') < 0) {
                if (!addedHtml || allowExtraHTML ) {
                    lines.push("    jsl.push({f:'html/templates.json', n: 'templates', j: 0, w: " + getWeight("html/templates.json") +  "});");
                    if (allowExtraHTML) {
                        allowExtraHTML = false;
                    }
                }
                addedHtml = true;
            } else {
                lines.push(content[i]);

                var currentSection =
                    content[i].indexOf('if (is_drop') > 0 ? 'drop' :
                        content[i].indexOf('if (is_embed') > 0 ? 'embed' :
                            section;

                if (currentSection !== section) {
                    // console.log('Section move, %s->%s', section, currentSection);
                    section = currentSection;

                    for (const k in seenFiles) {
                        if (seenFiles[k] > 1) {
                            errors.push(['ERROR: The file "%s" was included %d times!', k, seenFiles[k]]);
                        }
                    }
                    seenFiles = {};

                    if (section === 'drop') {
                        // no longer need to check for seen-files
                        watchSeenFiles = false;
                    }
                }
            }

            if (watchSeenFiles && file) {
                if (section !== 'lite' || file.indexOf('retina-images') < 0) {
                    seenFiles[file] = (seenFiles[file] | 0) + 1;
                }
            }
        }
        lines = lines.join("\n");

        // process jsl3 entries
        lines = lines.replace(/jsl3\s*=\s*\{[\s\S]+?var subpages/, function(m) {
            m = m.replace('var subpages', '');
            eval(m);

            if (jsl3) {
                var js  = {};
                var css = {};
                for (var group in jsl3) {
                    var rscs = jsl3[group];

                    js[group]  = [];
                    css[group] = [];

                    for (var j in rscs) {
                        var f = rscs[j];

                        if (f.j === 1 || f.j === 5) {
                            f.n = j;
                            js[group].push(f);
                        }
                        else if (f.j === 2) {
                            f.n = j;
                            css[group].push(f);
                        }
                        else {
                            die('Unknown jsl3 resource', f);
                        }
                    }
                }

                var jsl3_new = {};
                var jsl3_singleBundle = {webgl: 5};
                [js, css].forEach(function(r) {
                    var length;
                    var content;
                    var idx   = 0;
                    var pfx   = r === js ? 'js' : 'css';
                    var write = function(g) {
                        if (content.length) {
                            var filename = pfx + '/' + g + '-group' + (++idx) + '.' + pfx;
                            fs.writeFileSync(filename, content.join("\n"));
                            bundleFiles.push(filename);

                            if (!jsl3_new[g]) {
                                jsl3_new[g] = {};
                            }
                            var name = g + '_group' + idx + '_' + pfx;
                            jsl3_new[g][name] = {
                                f: filename,
                                n: name,
                                j: jsl3_singleBundle[g] || ((pfx[0] === 'c') + 1),
                                w: Math.round((length/fileLimit)*30)
                            };
                            content = [];
                            length  = 0;
                        }
                    };

                    for (var g in r) {
                        var nn  = r[g];
                        length  = 0;
                        content = [];
                        idx     = 0;

                        for (var i = 0; i < nn.length; i++) {
                            var f    = nn[i];
                            if (jsl3_singleBundle[g]) {
                                content.push(fs.readFileSync(f.f).toString());
                                continue;
                            }
                            var size = fs.statSync(f.f).size;
                            if (length + size > fileLimit) {
                                write(g);
                            }
                            content.push(fs.readFileSync(f.f).toString());
                            length += size;
                        }

                        write(g);
                    }
                });

                m = 'jsl3 = ' + JSON.stringify(jsl3_new).replace(/"/g, "'").replace(/'(\w)':/g, '$1:') + '\n';
            }

            return m + '    var subpages';
        });

        if (usePostCSS || usePostHTML) {
            const read = file => fs.readFileSync(file).toString('utf8');
            const diff = (file1, file2) => {
                file2 = read(file2);
                return read(file1) !== file2 ? file2 : false;
            };
            const copy = (src, dst, writeThisData) => {
                try {
                    if (writeThisData) {
                        fs.writeFileSync(dst, writeThisData);
                    }
                    else {
                        fs.copyFileSync(src, dst);
                    }

                    if (debug) {
                        console.log('INFO: Created "%s"', dst);
                    }
                }
                catch (ex) {
                    die('Something went wrong copying', {src, dst}, ex);
                }
            };

            lines = lines.replace(/{f:'((?:html|css)[^']+)[^}]+}/g, (match, file) => {

                if (file.endsWith('.html') || file.endsWith('.css')) {
                    const type = file.replace(/\/.*$/, '');
                    const buildFile = path.join(cwd, getBuildFile(file));

                    if (fs.existsSync(buildFile)) {
                        const origFile = path.join(cwd, file);
                        const changed = diff(origFile, buildFile);

                        if (changed) {
                            const jslFile = file + '-postbuild.' + type;
                            const newFile = path.join(cwd, jslFile);

                            copy(buildFile, newFile,
                                useEmbedMode && changed.includes('url(--url-')
                                && changed.replace(/url\(--url-/g, 'var(--url-'));

                            match = match.replace(file, jslFile);
                        }
                    }
                }

                return match;
            });
        }

        fs.writeFileSync(name, lines);

        // print out coverage
        outOfBundle = outOfBundle.map(function(f) {
            f = String(f).trim();
            if (!f.startsWith('//')) {
                f = f.match(/f:'([^']+)'/)[1];
                if (!/^(js\/(beta|vendor))|makecache|dont-deploy/.test(f)) {
                    const type = ({'.css': 'css', 'html': 'html'})[f.substr(-4)];
                    return f + ' (' + (type && FS.stat(`${f}-postbuild.${type}`) || FS.stat(f)).size + ' bytes)';
                }
            }
            return '';
        }).filter(String).sort();

        if (outOfBundle.length) {
            console.info('Files leaved out of a bundle:\n- ' + outOfBundle.join('\n- '));
            console.info('-- %d', outOfBundle.length);
        }

        // check for small bundles.
        bundleFiles.forEach(function(f) {
            var size = fs.statSync(f).size;
            if (size < 24000) {
                console.warn('WARNING: Small bundle generated, file "%s" of %d bytes', f, size);
            }
        });

        // check for files included more than once.
        for (let idx = errors.length; idx--;) {
            console.error(...errors[idx]);
        }
    };

    ns.getJS = function() {
        return jsl.filter(function(f) {
            return f.f.match(/jsx?$/);
        });
    };

    ns.getCSS = function() {
        return jsl.filter(function(f) {
            return f.f.match(/(?:css|jsx)$/);
        }).map(function(f) {
            if (usePostCSS && String(f.f).startsWith('css/')) {
                f.f = getBuildFile(f.f);
            }
            return f;
        });
    };

    ns.getHTML = function() {
        return jsl.filter((f) => /\.html?$/.test(f.f))
            .map((f) => {
                return {...f, bf: usePostHTML ? getBuildFile(f.f) : f.f};
            });
    };

    ns.getCSSGroups = function() {
        var groups = [];
        var size = 0;
        this.getCSS().forEach(function(f) {
            if (f.f == "\0.jsx") {
                groups.push(null);
                size = 0;
            } else {
                if (size > fileLimit) {
                    size = 0;
                    groups.push(null);
                }
                groups.push(f.f);
                size += fs.statSync(f.f)['size'];
            }
        });
        groups.push(null);

        var files = {};
        var i = 0;
        while (groups.length > 0) {
            var id = groups.indexOf(null);
            if (id > 1) {
                files['css/mega-' + (++i) + '.css'] = groups.splice(0, id);
            }
            groups.splice(0, 1);
        }

        return files;
    };

    ns.getGroups = function(header) {
        const groups = Object.assign({}, this.getJSGroups(), this.getCSSGroups());

        if (header) {
            var lines = [];
            var file;
            var i = 0;
            for (var e in groups) {
                if (groups.hasOwnProperty(e)) {
                    lines = [];
                    this.addHeader(lines, groups[e]);
                    file = getBuildFile(`banner-${++i}.js`);
                    fs.writeFileSync(file, lines.join("\n").replace(/\n +/g, '\n '));
                    groups[e].unshift(file);
                }
            }
        }

        return groups;
    };

    ns.getJSGroups = function() {
        var groups = [];
        var size = 0;
        var sjcl = -1;
        var limit = fileLimit;
        this.getJS().forEach(function(f) {
            if (f.f == "\0.jsx") {
                groups.push(null);
                size = 0;
            }
            else if (f.j == 5) {
                groups.push(null);
                size = 0;
            }else {
                // if (f.f === 'sjcl.js' && ++sjcl) fileLimit = 78e4; // bigger files for embed player
                var fsize = f.f.startsWith('js/mobile/') ? 0 : fs.statSync(f.f)['size'];
                if (size + fsize > fileLimit) {
                    size = 0;
                    groups.push(null);
                }
                groups.push(f.f);
                size += fsize;
            }
        });
        groups.push(null);

        var files = {};
        var i = 0;
        while (groups.length > 0) {
            var id = groups.indexOf(null);
            if (id > 1) {
                files['js/mega-' + (++i) + '.js'] = groups.splice(0, id);
            }
            groups.splice(0, 1);
        }

        fileLimit = limit;
        return files;
    };

    return ns;
}();

const stdout = process.stdout;
const write = stdout.write;
if (!debug) {
    stdout.write = function(s) {
        if (s && !String(s).includes('.css\x1b[39m created.')) {
            write.apply(stdout, arguments);
        }
    };
}

const [postTaskFinalizer, postHtmlTreeWalker, postHtmlURLRebase, postCssURLRebase] = (() => {
    'use strict';
    const now = Date.now();
    const ONE_YEAR = 365 * 864e5;
    const mime = require('mime');
    const seen = Object.create(null);
    const embed = Object.create(null);
    const xxmcache = Object.create(null);
    const xxhash64 = require('xxhashjs').h64;

    const getDataURI = (path) => 'data:' + mime.getType(path) + ';base64,' + fs.readFileSync(path).toString('base64');
    const getUniquePathID = (path, sep = '-') => path.replace(cwd, '').replace(/^\W+/, '').replace(/\W+/g, sep);
    const isNewerThanOneYear = (mtime) => (now - mtime < ONE_YEAR);

    const read = (path, length, offset) => {
        const buf = Buffer.alloc(length);
        const fd = fs.openSync(path, 'r');
        fs.readSync(fd, buf, 0, length, Math.round(offset || 0));
        fs.closeSync(fd);
        return buf;
    };

    const stat = path => {
        try {
            return fs.statSync(path);
        }
        catch (ex) {}

        return false;
    };

    const checksum = (path, size = -0x9eef) => {
        const file = getUniquePathID(path);

        if (!xxmcache[file]) {
            const xxh = xxhash64(0x9fee);

            if (size === -0x9eef) {
                xxh.update(path);
            }
            else if (size < 8192) {
                xxh.update(fs.readFileSync(path));
            }
            else {
                for (let len = size / 16, offset = 0, i = 4; i--;) {
                    xxh.update(read(path, len, offset));
                    offset += len * 5;
                }
            }

            xxmcache[file] = xxh.digest().toString(16);
        }

        return xxmcache[file];
    };

    const report = !debug ? () => {} : (path, size, hash) => {
        if (!seen[path]) {
            seen[path] = 1;
            console.info('url-rewrite: %s%s %s', (hash || 'Embedded.').padStart(20), String(size).padStart(9), path);
        }
    };

    const doImagery = (asset, size, hash, source, mtime) => {
        const ok = !asset.pathname.includes('fonts/') && isNewerThanOneYear(mtime);

        if (ok) {
            const src = asset.absolutePath;
            const dst = getUniquePathID(src).replace(/-(\w+)$/, `.${hash}.$1`);

            const resource = `imagery/${dst.replace('images-', '')}`;
            const target = path.join(cwd, TARGET, resource);

            fs.copyFileSync(src, target);
            report(target, size, hash);

            const root = String(source).endsWith('.css') ? '../' : '{staticpath}';
            return `${root}${resource}${asset.search || ''}${asset.hash || ''}`;
        }
    };

    const shallEmbed = (resource, mtime, file = '') => {
        return !file.includes('embedplayer')
            && !resource.includes('embed-sprite')
            && !resource.includes('fonts/')
            && isNewerThanOneYear(mtime);
    };

    const rewrite = (asset, source = '', limit = 640) => {
        const path = asset.absolutePath;
        const {size, mtime} = asset.pathname && stat(path) || {};

        if (size) {

            if (useEmbedMode && shallEmbed(path, mtime, source)) {
                report(path, size);

                if (String(source).endsWith('.css')) {
                    const urlvar = '--url-' + getUniquePathID(asset.pathname);

                    if (!embed[urlvar]) {
                        embed[urlvar] = getDataURI(path);
                    }

                    return urlvar;
                }

                return getDataURI(path);
            }

            if (size < limit) {
                report(path, size);
                return getDataURI(path);
            }

            const v = checksum(path, size);

            if (useImageryMode) {
                const image = doImagery(asset, size, v, source, mtime);
                if (image) {
                    return image;
                }
            }

            report(path, size, v);
            return asset.pathname + (asset.search ? asset.search + '&' : '?') + 'v=' + v + (asset.hash || '');
        }
        else if (asset.pathname) {
            report(path, '-', 'Not found.');
        }

        return asset.url;
    };

    const urlToAsset = (url) => {
        const asset = {url, pathname: url};

        if (url.includes('?') || url.includes('#')) {
            const uri = new URL(url.replace('{staticpath}', 'https://mega.nz/'));
            asset.hash = uri.hash;
            asset.search = uri.search;
            [asset.pathname] = url.split(/[?#]/);
        }
        asset.absolutePath = asset.pathname.replace('{staticpath}', cwd + path.sep);

        return asset;
    };

    const getPictureCs1 = (folder, name, extension) => {
        const cs = [];
        const types = ['desktop', 'mobile'];

        for (let i = types.length; i--;) {
            const type = types[i];

            cs.push(rewrite(urlToAsset(`{staticpath}${folder}/${name}_${type}.${extension}`)));
            for (let i = 2; i < 4; i++) {
                cs.push(rewrite(urlToAsset(`{staticpath}${folder}/${name}_${type}@${i}x.${extension}`)));
            }
        }

        return checksum(cs.join('$'));
    };

    const getPictureCs2 = (folder, name, extension) => {
        if (!useImageryMode) {
            throw new Error('uhm');
        }
        const imagery = (tuple) => {
            if (Array.isArray(tuple)) {
                const hash = checksum('' + tuple.map(v => v[1]));
                const result = getUniquePathID(`${folder}/${name}.${hash}`).replace('images-mega-', 'picture-');

                for (let i = tuple.length; i--;) {
                    const [src] = tuple[i];
                    const target = path.join(cwd, TARGET, 'imagery', basename(src).replace(name, result));

                    if (debug) {
                        report(target, FS.stat(src).size, hash);
                    }
                    fs.copyFileSync(src, target);
                }

                return result;
            }
            const asset = urlToAsset(tuple);
            const hash = checksum(asset.absolutePath, -1);
            return [asset.absolutePath, hash];
        };

        const cs = [];
        const types = ['desktop', 'mobile'];
        for (let i = types.length; i--;) {
            const type = types[i];

            cs.push(imagery(`{staticpath}${folder}/${name}_${type}.${extension}`));
            for (let i = 2; i < 4; i++) {
                cs.push(imagery(`{staticpath}${folder}/${name}_${type}@${i}x.${extension}`));
            }
        }

        return imagery(cs);
    };

    return [

        () => {
            if (useEmbedMode && Object.keys(embed).length) {
                const themeCss = path.join(cwd, TARGET, 'css', 'theme.css');
                const content = fs.readFileSync(themeCss);
                const vars = [];

                for (const urlvar in embed) {
                    const dataUri = embed[urlvar];

                    vars.push(`${urlvar}:url(${dataUri})`);
                }

                fs.writeFileSync(themeCss, content + '\n:root{\n' + vars.join(';\n') + '\n}');
            }
        },

        (tree) => {
            tree.walk((node) => {
                if (node.attrs) {
                    if (node.tag === 'picture') {
                        const {attrs} = node;

                        if (String(attrs['data-folder']).startsWith('images/')) {
                            const {'data-folder': folder, 'data-name': name, 'data-extension': extension} = attrs;

                            if (useImageryMode) {
                                attrs['data-folder'] = 'imagery';
                                attrs['data-name'] = getPictureCs2(folder, name, extension);
                            }
                            else {
                                const pv = getPictureCs1(folder, name, extension);
                                attrs['data-extension'] += '?pv=' + pv;
                            }
                        }
                    }
                }
                return node;
            });
        },

        usePostHTML && require('posthtml-urls')({
            filter: {
                img: {src: true, srcset: true},
                source: {src: true, srcset: true}
            },
            eachURL(url) {
                if (!url.startsWith('{staticpath}')) {
                    if (!url.startsWith('data:')) {
                        console.warn(`WARNING: Unexpected Resource URL ${url}`);
                    }
                    return url;
                }

                return rewrite(urlToAsset(url));
            }
        }),

        usePostCSS && require('postcss-url')({
            url(asset, dir, opts, decl, w, res) {
                return rewrite(asset, res.opts.from);
            }
        })
    ];
})();

let concatGroups = null;
const ensureCallablePlugIn = array => array.filter(Boolean);

module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        postcss: {
            options: {
                safe: true,
                failOnError: true,
                sequential: true,
                processors: ensureCallablePlugIn([
                    require('cssnano')({
                        preset: [
                            'default', {
                                svgo: false,
                                discardDuplicates: false,
                                normalizeWhitespace: false,
                            }
                        ]
                    }),
                    rebaseURLs && postCssURLRebase,
                    (css) => {
                        css.walk((node) => {
                            const {type} = node;

                            if (type === 'decl') {
                                if (node.raws.before) {
                                    const prev = node.prev();

                                    if (prev && prev.type !== 'rule') {
                                        node.raws.before = node.raws.before.replace(/;/g, '');
                                    }
                                    node.raws.before = node.raws.before.replace(/[\t ]+/g, '\t');
                                }

                                node.raws.between = ':';
                                node.raws.semicolon = false;
                            }
                            else if (type === 'rule' || type === 'atrule') {
                                node.raws.after = '\n';
                                node.raws.before = '\n';
                                node.raws.between = '';
                                node.raws.semicolon = false;
                            }
                        });
                    }
                ])
            },
            dist: {expand: true, flatten: false, src: ['css/*.css', 'css/**/*.css'], dest: TARGET}
        },
        posthtml: {
            options: {
                use: ensureCallablePlugIn([
                    rebaseURLs && postHtmlURLRebase,
                    rebaseURLs && postHtmlTreeWalker,
                    require('htmlnano')({
                        removeEmptyAttributes: false,
                        sortAttributesWithLists: false,
                        removeComments(comments) {
                            const clean = comments.replace(/<!--[\S\s]*?-->/, '').trim();
                            if (clean) {
                                process.stderr.write(`WARNING: text-node surrounding comment: ${comments}\n`);
                                return false;
                            }
                            return true;
                        },
                        collapseWhitespace: process.env.DEBUG ? false : 'conservative'
                    })
                ])
            },
            dist: {expand: true, flatten: false, src: ['html/*.html', 'html/**/*.html'], dest: TARGET}
        },
        concat: {
            prod: {
                options: {
                    sourceMap: false,
                    process: function(content, filename) {
                        if (String(filename).endsWith('.css')) {
                            content = content.replace(/(?:\.\.\/)+/g, '../');

                            if (useEmbedMode) {
                                content = content.replace(/url\(--url-/g, 'var(--url-');
                            }
                        }
                        return content.trim() + "\n";
                    }
                },
                get files() {
                    if (!concatGroups) {
                        stdout.write = write;
                        postTaskFinalizer();
                        concatGroups = Secureboot.getGroups(true);
                    }
                    return concatGroups;
                },
            }
        },
    });

    grunt.registerTask('htmljson', () => {
        const res = {};
        const exclude = {embedplayer: 1};
        const files = Secureboot.getHTML().sort();

        for (let i = files.length; i--;) {
            const {bf: file, n} = files[i];
            const name = basename(file).split('.')[0];

            if (!exclude[name]) {
                let k = n || name;
                if (debug || k !== name) {
                    console.warn(`%s Using '${n}' for html-template ~/%s`, debug && k !== name ? '[!] >>' : '', file);
                }
                res[k] = fs.readFileSync(path.join(cwd, file)).toString('utf-8');
            }
        }

        // @todo split mobile/desktop files.
        fs.writeFileSync(path.join(cwd, 'html', 'templates.json'), JSON.stringify(res));
    });

    grunt.registerTask('cleanup', () => {
        const build = path.join(cwd, TARGET);

        if (FS.isDir(build)) {
            console.log('Cleaning up old build files...');

            FS.rm(build);
            FS.rm(path.join(cwd, 'html', 'templates.json'));

            FS.ls(path.join(cwd, 'html'), /-postbuild\.html$/,
                FS.ls(path.join(cwd, 'js'), /(?:-group\d+|mega-\d+)\.js$/,
                    FS.ls(path.join(cwd, 'css'), /(?:-group\d+|mega-\d+|-postbuild)\.css$/))).forEach(FS.rm);
        }

        if (useImageryMode) {
            FS.mkdir(cwd, TARGET, 'imagery');
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');

    // Default task(s).
    var tasks = ['concat', 'htmljson', 'secureboot'];
    if (usePostCSS) {
        grunt.loadNpmTasks('@lodder/grunt-postcss');
        tasks.unshift('postcss');
    }
    if (usePostHTML) {
        grunt.loadNpmTasks('grunt-posthtml');
        tasks.unshift('posthtml');
    }
    grunt.registerTask('secureboot', function() {
        console.log("Write secureboot.prod.js");
        Secureboot.rewrite("secureboot.prod.js");
    });

    tasks.unshift('cleanup');
    grunt.registerTask('default', tasks);
    grunt.registerTask('prod', tasks); // <- remove me if unused
};
