/// <reference path="..\lib\requirejs\require.d.ts" />
require.config({
    baseUrl: "../scripts",
    paths: {
        "jquery": "../lib/jquery.min"
    }
});
require(["popup"], function() {});
