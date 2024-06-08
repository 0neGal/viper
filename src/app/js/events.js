const EventEmitter = require("events");
class Emitter extends EventEmitter {};
const events = new Emitter();

module.exports = events;
