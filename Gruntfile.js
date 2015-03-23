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
            },
			vendor: {
				src: 'js/mega-vendor.js',
				dest: 'js/mega-vendor.js',
            },
			plugins: {
				src: 'js/mega-chat-plugins.js',
				dest: 'js/mega-chat-plugins.js',
            },
			mega_chat: {
				src: 'js/mega-chat.js',
				dest: 'js/mega-chat.js',
            },
			ui: {
				src: 'js/mega-ui.js',
				dest: 'js/mega-ui.js',
            },
			crypto: {
				src: 'js/mega-crypto.js',
				dest: 'js/mega-crypto.js',
            },
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
			crypto:  {
				src: ["sjcl.js", "js/asmcrypto.js", "js/tlvstore.js", "js/crypto.js", "js/jsbn.js", "js/jsbn2.js", "js/jodid25519.js", "js/user.js", "js/authring.js", "js/mouse.js"],
				dest: "js/mega-crypto.js",
				},
			jquery: {
				src: ["js/jquery-2.1.1.js", "js/jquery*", "js/vendor/jquery*"],
				dest: "js/mega-jquery.js",
			},
			vendor: {
				src: ["js/vendor/chat/strophe.js", "js/vendor/*.js", "js/vendor/**/*.js"],
				dest: "js/mega-vendor.js",
			},
			plugins: {
				src: ["js/chat/plugins/*.js"],
				dest: "js/mega-chat-plugins.js",
			},
			ui : {
				src: ["js/ui/filepicker.js", "js/ui/dialog.js", "js/ui/*.js", "js/chat/ui/*"],
				dest: "js/mega-ui.js",
			},
			mega_chat: {
				src : [
					'js/chat/mpenc.js', 
					'js/chat/opQueue.js', 
					'js/chat/rtc*.js',
					'js/chat/karereEventObjects.js',
					'js/chat/karere.js',
					'js/chat/chat.js', 
					'js/chat/chatRoom.js',
					'js/chat/*.js',
				],
				dest : 'js/mega-chat.js',
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
    grunt.registerTask('default', ['htmlmin', 'concat', 'htmljson']);
    grunt.registerTask('prod', ['default', 'uglify']);
};
