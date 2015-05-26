var fs = require('fs');
var RJSON = require('relaxed-json');

/* GetFilesFromSecureBoot {{{
 *
 *  Read secureboot.js, get information about the Javascripts, how to group them and
 *  templates info.
 *
 *  Secureboot.js follows some patterns, this function will extract Javascripts and HTML
 *  files that are loaded. It also writes a `secureboot.prod.js` which loads the
 *  concat'ed files
 *
 *  Return a hash with rules to build
 *
 *  @return hash
 */
function getRulesFromSecureBoot()
{
    var content = fs.readFileSync("secureboot.js").toString().split("\n");

    var htmls = [];  /* list of HTML templates */
    var htmlExtra = [];  /* list of HTML templates which are loaded on demand */
    var js = {};  /* list of JS files */
    var newSecureboot = [];  /* lines of JS, to rebuild secureboot.js */

    content.forEach(function(line) {
        var include = true;
        var isObject = line.match(/{[^}]+}/);
        var obj;
        if (isObject && isObject[0]) {
            try {
                obj = RJSON.parse(isObject[0]);
            } catch (e) {
                /* It's an invalid JSON */
                return;
            }
            if (obj.g && (obj.f || "").match(/js$/)) {
                /*
                 * It's a Javascript definition and it belongs to a group
                 */
                if (!js[obj.g]) {
                    /* We never saw this group before, therefore
                     * we replace this entry with the group javascript
                     */
                    js[obj.g] = [ obj.f ];
                    obj.f = "js/pack-" + obj.g + ".js";
                    line = "jsl.push(" + JSON.stringify(obj) + ")";
                } else {
                    /**
                     * This JS belongs to a group that was loaded already
                     * so we ignore this line
                     */
                    include = false;
                    js[obj.g].push(obj.f);
                }
            } else if ((obj.f || "").match(/\.html$/)) {
                if (line.indexOf("jsl.push") > 1) {
                    /* It's an HTML template that needs to be loaded at boot time */
                    htmls.push("build/" + obj.f);
                    /* We load html/boot.json instead, *the first time* */
                    obj.f = "html/boot.json";
                    line = 'jsl.push(' + RJSON.stringify(obj) + ")";
                    include = !js['html'];
                    js['html'] = true;
                } else {
                    /* It's a template laoded on demand. We group it as html/extra.json */
                    htmlExtra.push("build/" + obj.f);
                    /* Replace the files to load */
                    line = line.replace(obj.f, "html/extra.json");
                }
            }
        }
        if (include) {
            newSecureboot.push(line);
        }
    });

    var concat = {}; /* concat rules */
    var uglify = {}; /* uglify rules */

    delete js['html'];

    for (var i in js) {
        concat[i] = {
            src: js[i],
            dest: "js/pack-" + i + ".js"
        };
        uglify[i] = {
            options: {
                sourceMap: true,
            },
            src: "js/pack-" + i + ".js",
            dest: "js/pack-" + i + ".js",
        };
    }

    fs.writeFileSync("secureboot.prod.js", newSecureboot.join("\n"));

    return {concat: concat, uglify: uglify, htmls: htmls, htmlExtra: htmlExtra};
}
/* }}} */

module.exports = function(grunt) {

    var rules = getRulesFromSecureBoot();


    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: rules.glify,
        concat: rules.concat,
        htmlmin: {
            default_options: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                },
                files:[
                     {expand: true, src: ['html/*.html', 'html/**/*.html'], dest: 'build/'},
                ],
            },
        },
        htmljson: {
            required: {
                src: rules.htmls,
                dest: "html/boot.json",
            },
            extra: {
                src: rules.htmlExtra,
                dest: "html/extra.json",
            },
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
