var fs = require('fs');

module.exports = function(grunt) {

	var secure = fs.readFileSync("secureboot.js").toString().split("\n")

	var htmls = [], htmlExtra = [], js = {}
	secure.forEach(function(l) {
		if (l.match(/f:.+\.js.+g:/)) {
			eval("var y = " + l.match(/{[^}]+}/)[0])
			if (y.g && y.f) {
				if (!js[y.g]) js[y.g] = []
				js[y.g].push(y.f)
			}
		} else if (l.indexOf(".html") > 1) {
			if (l.indexOf("jsl.push") > 1) {
				htmls.push( "build/html/" + l.match(/\/(.+.html)/)[1] )	
			} else if (l.indexOf(":") > 1) {
				htmlExtra.push( "build/html/" + l.match(/\/(.+.html)/)[1] )	
			}
		}
	});

	var concat = {}, uglify = {}

	for (var i in js) {
		concat[i] = {
			src: js[i],
			dest: "js/xmega-" + i + ".js"
		}
		uglify[i] = {
			options: {
				sourceMap: true,
			},
			src: "js/xmega-" + i + ".js",
			dest: "js/xmega-" + i + ".js",
		}
	}

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
