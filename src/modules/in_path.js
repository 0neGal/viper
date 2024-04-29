const fs = require("fs");
const join = require("path").join;

// checks whether `executable_to_check` is in `$PATH`
module.exports = (executable_to_check) => {
	// get folders in `$PATH`
	let path_dirs = process.env["PATH"].split(":");

	// run through folders
	for (let i = 0; i < path_dirs.length; i++) {
		// path to executable this iteration
		let executable = join(path_dirs[i], executable_to_check);

		// if `executable` exists and is a file, then we found it
		if (fs.existsSync(executable)
			&& fs.statSync(executable).isFile()) {

			return true;
		}
	}

	// we didn't find `executable_to_check`
	return false;
}
