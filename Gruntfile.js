module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({

        clean: [
            "dist"
        ],

        tslint: {
            options: {
                //configuration: grunt.file.readJSON("tslint.js")
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
                dest: 'src/scripts',
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
    grunt.registerTask('default', ['clean', 'typescript', 'tslint', 'requirejs']);
    grunt.registerTask('test',  ['run:webdriver','intern','stop:webdriver']);

};