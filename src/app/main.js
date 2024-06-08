const fs = require("fs");
const path = require("path");
const Fuse = require("fuse.js");
const { app, ipcRenderer, shell } = require("electron");

const lang = require("../lang");

ipcRenderer.on("unknown-error", (event, err) => {
	new Toast({
		timeout: 10000,
		scheme: "error",
		title: lang("gui.toast.title.unknown_error"),
		description: lang("gui.toast.desc.unknown_error"),
		callback: () => {
			new Toast({
				timeout: 15000,
				scheme: "error",
				title: "",
				description: err.stack.replaceAll("\n", "<br>")
			})
		}
	})

	console.error(err.stack);
})

const json = require("../modules/json");

const kill = require("./js/kill");
const update = require("./js/update");
const events = require("./js/events");
const launch = require("./js/launch");
const version = require("./js/version");
const request = require("./js/request");
const process = require("./js/process");
const settings = require("./js/settings");
const gamepath = require("./js/gamepath");
const is_running = require("./js/is_running");
const set_buttons = require("./js/set_buttons");

require("./js/dom_events");
require("./js/set_dom_strings")();
