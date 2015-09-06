//# sourceURL=content.js
/// <reference path="..\lib\requirejs\require.d.ts" />

import MessageService = require("./MessageService");
import MessageHandlers = require("./MessageHandlers");
import ContentScript = require("./ContentScript");

var messageService = new MessageService(),
    messageHandlers = new MessageHandlers(),
    contentScript = new ContentScript(messageService, messageHandlers);
contentScript.initialize();
