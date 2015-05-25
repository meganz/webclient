var fs = require('fs');

/* GetFilesFromSecureBoot {{{
 *
 *  Read secureboot.js, get information about the Javascripts, how to group them and
 *  templates info.
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
    var nlines = [];  /* lines of JS, to rebuild secureboot.js */

    content.forEach(function(line) {
        var include = true;
        if (line.match(/f:.+\.js.+g:/)) {
            eval("var y = " + line.match(/{[^}]+}/)[0]);
            if (y.g && y.f) {
                if (!js[y.g]) {
                    js[y.g] = [];
                } else {
                    include = false;
                }
                js[y.g].push(y.f);
            }
            line = "/*placeholder-" + y.g + "*/";
        } else if (line.indexOf(".html") > 1) {
            if (line.indexOf("jsl.push") > 1) {
                htmls.push("build/html/" + line.match(/\/(.+.html)/)[1]);
                line = 'jsl.push({f: "html/boot.json", n:"prod_assets_boot", j:9})';
                include = !js['html'];
                js['html'] = true;
            } else if (line.indexOf(":") > 1) {
                htmlExtra.push("build/html/" + line.match(/\/(.+.html)/)[1]) ;
                line = line
                    .replace(/html\/[^\.]+\.html/, "html/extra.json")
                    .replace(/j:[ \t\r]*\d/, "j:9");
            }
        }
        if (include) {
            nlines.push(line);
        }
    });

    nlines = nlines.join("\n");

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
        nlines = nlines.replace(
            "/*placeholder-" + i + "*/",
            "jsl.push({f:'js/pack-" + i+ ".js', n: 'pack_" + i + "', g:'" + i + "', j:1});"
        );
    }

    fs.writeFileSync("secureboot.prod.js", nlines);

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
