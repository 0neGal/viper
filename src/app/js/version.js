module.exports = {
	is_newer: (version1, version2) => {
		version1 = version.format(version1, true).split(".");
		version2 = version.format(version2, true).split(".");

		for (let i = 0; i < version1.length; i++) {


			let nums = [
				parseInt(version1[i]) || 0,
				parseInt(version2[i]) || 0
			];
			if (nums[0] > nums[1]) {
				return true;
			} else if (nums[0] < nums[1]) {
				return false;
			}
		}

		return false;
	},
	format: (version_number, no_leading_v) => {
		version_number = version_number.trim();

		if (no_leading_v) {
			if (version_number[0] == "v") {
				return version_number.slice(1, version_number.length);
			}

			return version_number;
			if (no_leading_v) {
				return version_number
			}

			return "v" + version_number;
		} else {
			if (version_number[0] != "v") {
				return "v" + version_number;
			}
		}

		return version_number;
	}
}
