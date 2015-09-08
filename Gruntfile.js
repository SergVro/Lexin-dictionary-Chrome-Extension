module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({

        clean: {
            build: [
                "dist",
                "tests/unit/**/*.js",
                "tests/unit/**/*.map",
                "src/scripts/**/*.js",
                "src/scripts/**/*.map"
            ],
            temp: ['dist/temp']
        },

        tslint: {
            options: {
                configuration: grunt.file.readJSON("tslint.json")
            },
            sources: {
                src: ['src/scripts/**/*.ts']
            },
            tests: {
                src: ['tests/**/*.ts']
            }
        },


        watch: {
            sources: {
                files: ['<%= tslint.sources.src %>'],
                tasks: ['tslint:sources', 'typescript:sources'],
            },
            tests: {
                files: ['<%= tslint.tests.src %>'],
                tasks: ['tslint:tests', 'typescript:tests'],

            },
        },

        typescript: {
            sources: {
                src: ['src/scripts/**/*.ts'],
                options: {
                    module: 'amd', //or commonjs
                    target: 'es5', //or es3
                    sourceMap: true,
                    declaration: false
                }
            },
            tests: {
                src: ['tests/unit/**/*.ts'],
                options: {
                    module: 'amd', //or commonjs
                    target: 'es5', //or es3
                    sourceMap: true,
                    declaration: false
                }

            }
        },

        copy: {
            main: {
                files: [
                    {
                        expand: true,
                        cwd: 'src',
                        src: [
                            '**/*.*',
                            '!**/*.ts',
                            "!**/*.map",
                            "!lib/*/*.*"
                        ],
                        dest: 'dist/temp',
                        filter: 'isFile'
                    }
                ]
            }
        },

        requirejs: {
            compile: {
                options: {
                    appDir: "dist/temp",
                    //baseUrl: "src/scripts",
                    baseUrl: "scripts",
                    modules: [
                        { name: "history-main"},
                        { name: "options-main"},
                        { name: "popup-main"},
                        { name: "content-main"},
                        { name: "background-main"},
                        { name: "help-main"}
                    ],
                    //optimize: "none",
                    dir: "dist/min",
                    removeCombined: true,
                    paths: {
                        //jquery: "../lib/jquery.min"
                        "jquery": "empty:",
                        "jquery.flash": "empty:"
                    }
                }
            }
        },

        compress: {
            main: {
                options: {
                    archive: 'dist/lexin-extension.zip'
                },
                files: [
                    {expand: true, cwd: 'dist/min', src: ['**/*', '!build.txt']},
                ]
            }
        },

        run: {
            options: {
                wait: false
            },
            webdriver: {
                cmd: 'chromedriver', // make sure is in your PATH
                args: [
                    '--port=4444',
                    '--url-base=wd/hub'
                ]
            },
            phantomjs: {
                cmd: 'phantomjs',
                args: [
                    '--webdriver=4444'
                ]
            },
            selenium: {
                cmd: 'node',
                args:[
                    'node_modules/selenium-server/bin/selenium'
                ]
            }
        },

        intern: {
            main: {
                options: {
                    runType: 'runner', // defaults to 'client'
                    config: 'tests/intern',
                    reporters: [ 'Console' ],
                    suites: [ 'tests/unit/all' ]
                }
            },
            travis: {
                options: {
                    runType: 'runner', // defaults to 'client'
                    config: 'tests/intern-travis',
                    reporters: [ 'Console' ],
                    suites: [ 'tests/unit/all' ]
                }

            }
        },

    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-tslint');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('intern');

    // Default task(s).
    grunt.registerTask('build', ['clean', 'typescript', 'tslint', 'copy', 'requirejs', 'clean:temp', 'compress']);
    grunt.registerTask('test',  ['typescript:tests', 'run:webdriver','intern:main','stop:webdriver']);
    grunt.registerTask('travis',  ['build', 'run:selenium','intern:travis','stop:selenium']);


    grunt.registerTask('default', ['build', 'test']);

};