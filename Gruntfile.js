module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({

        clean: [
            "dist",
            "tests/unit/**/*.js",
            "tests/unit/**/*.map",
            "src/scripts/**/*.js",
            "src/scripts/**/*.map"
        ],

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

        typescript: {
            base: {
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

        requirejs: {
            compile: {
                options: {
                    appDir: "src",
                    //baseUrl: "src/scripts",
                    baseUrl: "scripts",
                    modules: [
                        { name: "history-main"},
                        { name: "options-main"},
                        { name: "popup-main"},
                        { name: "content"},
                        { name: "background-main"}
                    ],
                    //optimize: "none",
                    dir: "dist",
                    paths: {
                        //jquery: "../lib/jquery.min"
                        jquery: "empty:"
                    }
                }
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
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-tslint');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('intern');

    // Default task(s).
    grunt.registerTask('build', ['clean', 'typescript', 'tslint', 'requirejs']);
    grunt.registerTask('test',  ['typescript:tests', 'run:webdriver','intern:main','stop:webdriver']);
    grunt.registerTask('travis',  ['build', 'run:selenium','intern:travis','stop:selenium']);


    grunt.registerTask('default', ['build', 'test']);

};