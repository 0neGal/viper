let new_console = {
	...console
}

let orig_console = console;

new_console.ok = (...args) => {
	orig_console.log('\x1b[92m%s\x1b[0m', ...args)
}

new_console.misc = (...args) => {
	orig_console.warn('\x1b[90m%s\x1b[0m', ...args)
}

new_console.info = (...args) => {
	orig_console.warn('\x1b[94m%s\x1b[0m', ...args)
}

new_console.warn = (...args) => {
	orig_console.warn('\x1b[93m%s\x1b[0m', ...args)
}

new_console.error = (...args) => {
	orig_console.error('\x1b[91m%s\x1b[0m', ...args)
}

module.exports = new_console;
