/// <reference path="..\lib\requirejs\require.d.ts" />

require.config({
    baseUrl: "../scripts",
    paths: {
        "jquery": "../lib/jquery.min",
        "jquery.flash": "../lib/jquery.flash"
    },
    shim: {
        "jquery.flash": ["jquery"]
    }
});

require(["popup", "jquery.flash", "ga-config"], function() { });
