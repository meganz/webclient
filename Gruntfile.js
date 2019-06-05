var fs = require('fs');
var fileLimit = 512*1024;
var useHtmlMin = false;

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
            lines.push("     *   " + file);
        });
        lines.push("     */");
    }

    ns.rewrite = function(name) {
        var addedHtml = false;
        var lines = [];
        var jsgroup = [];
        var cssgroup = [];
        var seenFiles = {};
        var bundleFiles = [];
        var outOfBundle = [];
        var watchSeenFiles = true;
        var jsGroups = this.getJSGroups();
        var jsKeys   = Object.keys(jsGroups);
        var cssGroups = this.getCSSGroups();
        var cssKeys   = Object.keys(cssGroups);
        for (var i in content) {
            var file = null;
            if (content[i].match(/jsl\.push.+(js)/)) {
                file = content[i].match(/'.+\.(js)'/);
                if (!file) {
                    lines.push(content[i]);
                    continue;
                }
                file = file[0].substr(1, file[0].length-2);
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
                file = file[0].substr(1, file[0].length-2);
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
                if (!addedHtml) {
                    lines.push("    jsl.push({f:'html/templates.json', n: 'templates', j: 0, w: " + getWeight("html/templates.json") +  "});");
                }
                addedHtml = true;
            } else {
                lines.push(content[i]);

                if (content[i].indexOf('if (is_embed') > 0) {
                    // no longer need to check for seen-files
                    watchSeenFiles = false;
                }
            }

            if (watchSeenFiles && file) {
                seenFiles[file] = (seenFiles[file] | 0) + 1;
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

                        if (f.j == 1) {
                            f.n = j;
                            js[group].push(f);
                        }
                        else if (f.j == 2) {
                            f.n = j;
                            css[group].push(f);
                        }
                        else {
                            die('Unknown jsl3 resource', f);
                        }
                    }
                }

                var jsl3_new = {};
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
                                j: (pfx[0] == 'c') + 1,
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

        fs.writeFileSync(name, lines);

        // print out coverage
        outOfBundle = outOfBundle.map(function(f) {
            f = String(f).trim();
            if (!f.startsWith('//')) {
                f = f.match(/f:'([^']+)'/)[1];
                if (!/^(js\/(beta|vendor))|makecache|dont-deploy/.test(f)) {
                    return f + ' (' + fs.statSync(f).size + ' bytes)';
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
        for (var k in seenFiles) {
            if (seenFiles[k] > 1) {
                console.error('ERROR The file "%s" was included %d times!', k, seenFiles[k]);
            }
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
        });
    };

    ns.getHTML = function() {
        return jsl.filter(function(f) {
            return f.f.match(/html?$/);
        }).map(function(f) {
            return useHtmlMin ? 'build/' + f.f : f.f;
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
        var groups = this.getJSGroups();
        var css = this.getCSSGroups();
        for (var i in css) {
            if (css.hasOwnProperty(i)) {
                groups[i] = css[i];
            }
        }
        if (header) {
            var lines = [];
            var tmp = [];
            var file;
            var i = 0;
            for (var e in groups) {
                if (groups.hasOwnProperty(e)) {
                    lines = [];
                    file = "node_modules/banner-" + (++i) + ".js";
                    this.addHeader(lines, groups[e]);
                    fs.writeFileSync(file, lines.join("\n").replace(/\n +/g, '\n '));
                    groups[e].unshift(file);
                }
            }
            setTimeout(function() {
                console.error('delete');
                tmp.forEach(function(file) {
                    console.error(file);
                    fs.unlink(file);
                });
            }, 100);
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
            } else {
                // if (f.f === 'sjcl.js' && ++sjcl) fileLimit = 78e4; // bigger files for embed player
                var fsize = fs.statSync(f.f)['size'];
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


module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            prod: {
                options: {
                    sourceMap: false,
                    process: function(content, filename) {
                        return content.trim() + "\n";
                    }
                },
                files: Secureboot.getGroups(true),
            }
        },
        htmlmin: {
            default_options: {
                options: {
                    removeComments: true,
                    keepClosingSlash: true,
                    collapseWhitespace: true,
                },
                files:[
                     {expand: true, src: ['html/*.html', 'html/**/*.html'], dest: 'build/'},
                ],
            },
        },
        htmljson: {
            required: {
                src: Secureboot.getHTML(),
                dest: "html/templates.json",
            },
            /*
            extra: {
                src: rules.htmlExtra,
                dest: "html/extra.json",
            },
            */
        },
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-htmljson');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-concat');


    // Default task(s).
    var tasks = ['concat', 'htmljson', 'secureboot'];
    if (useHtmlMin) {
        tasks.unshift('htmlmin');
    }
    grunt.registerTask('secureboot', function() {
        console.log("Write secureboot.prod.js");
        Secureboot.rewrite("secureboot.prod.js");
    });
    grunt.registerTask('default', tasks);
    grunt.registerTask('prod', tasks); // <- remove me if unused
};
