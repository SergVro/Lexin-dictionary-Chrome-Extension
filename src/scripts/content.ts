//# sourceURL=content.js
/// <reference path="..\lib\requirejs\require.d.ts" />
import BackendService = require("./BackendService");
import ContentScript = require("./ContentScript");

var backendService = new BackendService(),
    contentScript = new ContentScript(backendService);
contentScript.initialize();
