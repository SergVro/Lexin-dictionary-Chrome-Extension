/// <reference path="..\lib\requirejs\require.d.ts" />
requirejs.config({
    baseUrl: "../scripts",
    paths: {
        "jquery": "../lib/jquery.min"
    }
});
requirejs(["history"], function() {});