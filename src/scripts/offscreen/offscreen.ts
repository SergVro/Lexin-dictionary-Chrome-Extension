import MessageHandlers from "../messaging/MessageHandlers.js";
import AudioPlayback from "./AudioPlayback.js";

const audioPlayback = new AudioPlayback(new MessageHandlers());
audioPlayback.initialize();
