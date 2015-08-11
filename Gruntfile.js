module.exports = function(grunt) {
    // Do grunt-related things in here
    function nodemonconfig(nodemon) {
        nodemon.on('start', function (event) {
            grunt.log.writeln("[nodemon] Started".green.bold);
        });
        nodemon.on('crash', function () {
            grunt.log.writeln("[nodemon]".green.bold+" CRASHED ".red.bold);
        });
        nodemon.on('exit', function () {
            grunt.log.writeln("[nodemon]".green.bold+" Exited peacefully ".yellow.bold);
        });
    }


    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concurrent:{
            dev:{
                tasks:['nodemon:dev','watch:client_debug','watch:server'],
                options:{
                    logConcurrentOutput: true
                }
            }
        },
        uglify: {
            release: {
                files : {
                    "build/public/js/client.js":["temp/client.js"]
                }
            }
        },
		concat: {
			dist: {
			  src: ["src/server/*.js"],
			  dest: 'build/server.js',
    		}
		},
        browserify:{
            release:{
                files:{
					"temp/client.js":["src/client/*.js"]
                }
            },
			debug:{
				files:{
					"build/public/js/client.js":["src/client/*.js"]
				}
			}
        },
        nodemon: {
            dev: {
                script: 'build/server.js',
                options: {
                    nodeArgs: ['--debug'],
                    delay: 700,
                    watch:['build/server.js'],
                    callback: nodemonconfig
                }
            }
        },
        watch:
        {
            options : {
                interrupt : true,
                atBegin : true
            },
            client_debug : {
                files : ['src/client/*.js'],
                tasks : ['browserify:debug']
            },
			server : {
                files : ['src/server/*.js'],
                tasks : ['concat']
            },
			compass : {
				files : ['src/scss/*.scss'],
                tasks : ['compass']
			}
        }

    });
    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-concurrent');

	grunt.registerTask('dev', ['concurrent:dev']);
    grunt.registerTask('default', ['concat','browserify:release','uglify:release']);
    grunt.registerTask('debug', ['concurrent:dev']);
};
