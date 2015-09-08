//# sourceURL=content.js
/// <reference path="..\lib\requirejs\require.d.ts" />

import MessageService = require("./Messaging/MessageService");
import MessageHandlers = require("./Messaging/MessageHandlers");
import ContentScript = require("./ContentScript");

var messageService = new MessageService(),
    messageHandlers = new MessageHandlers(),
    contentScript = new ContentScript(messageService, messageHandlers);
contentScript.initialize();
