var fs = require('fs');
var RJSON = require('relaxed-json');
var fileLimit = 512*1024;
var useHtmlMin = false;

var Secureboot = function() {
    var content = fs.readFileSync("secureboot.js").toString().split("\n");
    var jsl = getFiles();
    var ns  = {};

    function getWeight(filename) {
        return Math.round((fs.statSync(filename)['size']/fileLimit)*30);
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
                        lines.push('jsl.push({f:"\0.js"})');
                    }
                    line = line.replace(/else(\s*if)?/, 'if (true)');
                    line = line.replace(/\(.+\)/, '(true)');
                }
                lines.push(line);
                if (line.trim() == "}") {
                    lines.push('jsl.push({f:"\0.js"})');
                }
            }
        }
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
        var jsGroups = this.getJSGroups();
        var jsKeys   = Object.keys(jsGroups);
        var cssGroups = this.getCSSGroups();
        var cssKeys   = Object.keys(cssGroups);
        for (var i in content) {
            if (content[i].match(/jsl\.push.+(js)/)) {
                var file = content[i].match(/'.+\.(js)'/);
                if (!file) {
                    lines.push(content[i]);
                    continue;
                }
                file = file[0].substr(1, file[0].length-2);
                if (jsGroups[jsKeys[0]] && jsGroups[jsKeys[0]][0] == file) {
                    ns.addHeader(lines, jsGroups[jsKeys[0]]);
                    lines.push("    jsl.push({f:'" + jsKeys[0] + "', n: '" + jsKeys[0].replace(/[^a-z0-9]/ig, "-") + "', j: 1, w: " + getWeight(jsKeys[0]) + "});");
                    jsgroup = jsGroups[jsKeys.shift()];
                } else if (jsgroup.indexOf(file) == -1) {
                    lines.push(content[i]);
                }
            } else if (content[i].match(/jsl\.push.+(css)/)) {
                var file = content[i].match(/'.+\.(css)'/);
                if (!file) {
                    lines.push(content[i]);
                    continue;
                }
                file = file[0].substr(1, file[0].length-2);
                if (cssGroups[cssKeys[0]] && cssGroups[cssKeys[0]][0] == file) {
                    ns.addHeader(lines, cssGroups[cssKeys[0]]);
                    lines.push("    jsl.push({f:'" + cssKeys[0] + "', n: '" + cssKeys[0].replace(/[^a-z0-9]/ig, "-") + "', j: 2, w: " + getWeight(cssKeys[0]) + "});");
                    cssgroup = cssGroups[cssKeys.shift()];
                } else if (cssgroup.indexOf(file) == -1) {
                    lines.push(content[i]);
                }
            } else if (content[i].match(/jsl\.push.+html/)) {
                if (!addedHtml) {
                    lines.push("    jsl.push({f:'html/templates.json', n: 'templates', j: 0, w: " + getWeight("html/templates.json") +  "});");
                }
                addedHtml = true;
            } else {
                lines.push(content[i]);
            }
        }
        fs.writeFileSync(name, lines.join("\n"));
    };

    ns.getJS = function() {
        return jsl.filter(function(f) {
            return f.f.match(/js$/);
        });
    };

    ns.getCSS = function() {
        return jsl.filter(function(f) {
            return f.f.match(/css$/);
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
            if (size > fileLimit) {
                size = 0;
                groups.push(null);
            }
            groups.push(f.f);
            size += fs.statSync(f.f)['size'];
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
        this.getJS().forEach(function(f) {
            if (f.f == "\0.js") {
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
                files['js/mega-' + (++i) + '.js'] = groups.splice(0, id);
            }
            groups.splice(0, 1);
        }

        return files;
    };

    return ns;
}();


module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            prod: {
                options: {
                    sourceMap: true,
                },
                files: Secureboot.getJSGroups(),
            }
        },
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
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-htmljson');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-concat');


    // Default task(s).
    grunt.registerTask('secureboot', function() {
        console.log("Write secureboot.prod.js");
        Secureboot.rewrite("secureboot.prod.js");
    });
    grunt.registerTask('default', ['htmlmin', 'concat', 'htmljson', 'secureboot']);
    grunt.registerTask('prod', ['htmlmin', 'htmljson', 'uglify', 'secureboot']);
};
