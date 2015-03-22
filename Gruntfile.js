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
			jquery: {
				src: 'js/mega-jquery.js',
				dest: 'js/mega-jquery.js',
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
		concat: {
			jquery: {
				src: ["js/jquery*", "js/vendor/jquery*"],
				dest: "js/mega-jquery.js",
			}
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
    grunt.registerTask('default', ['htmlmin', 'concat', 'htmljson', 'uglify']);
};
