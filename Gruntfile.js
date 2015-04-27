var fs = require('fs');

module.exports = function(grunt) {

    var secure = fs.readFileSync("secureboot.js").toString().split("\n")

    /* move to a plugin {{{ */
    var htmls = [], htmlExtra = [], js = {}, code = [], has = {}
    secure.forEach(function(l) {
        var include = true
        if (l.match(/f:.+\.js.+g:/)) {
            eval("var y = " + l.match(/{[^}]+}/)[0])
            if (y.g && y.f) {
                if (!js[y.g]) js[y.g] = []
                else include = false
                js[y.g].push(y.f)
            }
            l = "/*placeholder-" + y.g + "*/"
        } else if (l.indexOf(".html") > 1) {
            if (l.indexOf("jsl.push") > 1) {
                htmls.push( "build/html/" + l.match(/\/(.+.html)/)[1] )    
                l = 'jsl.push({f: "html/boot.json", n:"prod_assets_boot", j:9})'
                include = !has['html']
                has['html'] = true
            } else if (l.indexOf(":") > 1) {
                htmlExtra.push( "build/html/" + l.match(/\/(.+.html)/)[1] )    
                l = l.replace(/html\/[^\.]+\.html/, "html/extra.json")
                l = l.replace(/j:[ \t\r]*\d/, "j:9")
            }
        }
        if (include) code.push(l)
    });
    code = code.join("\n")

    var concat = {}, uglify = {}

    for (var i in js) {
        concat[i] = {
            src: js[i],
            dest: "js/pack-" + i + ".js"
        }
        uglify[i] = {
            options: {
                sourceMap: true,
            },
            src: "js/pack-" + i + ".js",
            dest: "js/pack-" + i + ".js",
        }
        code = code.replace(
            "/*placeholder-" + i+"*/", 
            "jsl.push({f:'js/pack-"+i+ ".js', n: 'pack_"+i+"', g:'" + i +"', j:1});"
        )
    }
    fs.writeFileSync("secureboot.prod.js", code)
    /* }}} */

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: uglify,
        concat: concat, 
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
                src: htmls,
                dest: "html/boot.json",
            },
            extra: {
                src: htmlExtra,
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
