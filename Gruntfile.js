var fs = require('fs');

module.exports = function(grunt) {

	var secure = fs.readFileSync("secureboot.js").toString().split("\n")

	var htmls = [], htmlExtra = []
	secure.forEach(function(l) {
		if (l.indexOf(".html") > 1) {
			if (l.indexOf("jsl.push") > 1) {
				htmls.push( "build/html/" + l.match(/\/(.+.html)/)[1] )	
			} else if (l.indexOf(":") > 1) {
				htmlExtra.push( "build/html/" + l.match(/\/(.+.html)/)[1] )	
			}
		}
	});

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'src/<%= pkg.name %>.js',
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
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


    // Default task(s).
    grunt.registerTask('default', ['htmlmin', 'htmljson', 'uglify']);
};
