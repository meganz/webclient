var fs = require('fs');
var RJSON = require('relaxed-json');
var fileLimit = 512*1024;

var Secureboot = function() {
    var content = fs.readFileSync("secureboot.js").toString().split("\n");
    var jsl = getFiles();
    var ns  = {};

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
                    line = line.replace(/else/, 'else if (false)');
                    line = line.replace(/\(.+\)/, '(false)');
                }
                lines.push(line);
            }
        }
        eval(lines.join("\n"));
        return jsl;
    };

    ns.rewrite = function(name) {
        var addedHtml = false;
        var lines = [];
        var groups = this.getJSGroups();
        var keys   = Object.keys(groups);
        var group  = []
        for (var i in content) {
            if (content[i].match(/jsl\.push.+js/)) {
                var file = content[i].match(/'.+\.js'/);
                if (!file) {
                    lines.push(content[i]);
                    continue;
                }
                file = file[0].substr(1, file[0].length-2);
                if (groups[keys[0]] && groups[keys[0]][0] == file) {
                    lines.push("jsl.push({f:'" + keys[0] + "', n: '" + keys[0].replace(/[^a-z0-9]/ig, "-") + "', j: 1});");
                    group = groups[keys.shift()];
                } else if (group.indexOf(file) == -1) {
                    lines.push(content[i]);
                }
            } else if (content[i].match(/jsl\.push.+html/)) {
                if (!addedHtml) {
                    lines.push("jsl.push({f:'html/templates.json', n: 'templates', j: 0, w: 3});");
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

    ns.getHTML = function() {
        return jsl.filter(function(f) {
            return f.f.match(/html?$/);
        }).map(function(f) {
            return 'build/' + f.f;
        });
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

        var files = {};
        var i = 0;
        while (groups.length > 0) {
            var id = groups.indexOf(null);
            files['js/mega-' + (++i) + '.js'] = groups.splice(0, id);
            groups.splice(0, 1);
        }

        return files;
    };

    return ns;
}();

Secureboot.rewrite("secureboot.prod.js");

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
                    sourceMap: true,
                    process: function(content, filename) {
                        return "/*! Filename: " + filename + " */\n"
                            + content
                            + "\n";
                    }
                },
                files: Secureboot.getJSGroups(),
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
    grunt.registerTask('default', ['htmlmin', 'concat', 'htmljson']);
    grunt.registerTask('prod', ['default', 'uglify']);
};
