import MessageService from "../messaging/MessageService.js";
import MessageHandlers from "../messaging/MessageHandlers.js";
import ContentScript from "./ContentScript.js";

const messageService = new MessageService();
const messageHandlers = new MessageHandlers();
const contentScript = new ContentScript(messageService, messageHandlers);
contentScript.initialize();
