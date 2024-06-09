// localizes `string`, removing instances of `%%string%%` with
// `lang("string")` and so forth
function localize_string(string) {
	let parts = string.split("%%");

	// basic checks to make sure `string` has lang strings
	if (parts.length == 0
		|| string.trim() == "" || ! string.match("%%")) {
		return string;
	}

	for (let i = 0; i < parts.length; i++) {
		// simply checks to make sure it is actually a lang string.
		if (parts[i][0] != " " && 
			parts[i][parts[i].length - 1] != " ") {

			// get string
			let lang_str = lang(parts[i]);

			// make sure we got a string back, and if not, do nothing
			if (typeof lang_str !== "string") {
				continue;
			}

			// replace this part with the lang string
			parts[i] = lang_str;
		}
	}

	// return finalized formatted string
	return parts.join("");
}

// runs `localize_string()` on `el`'s attributes, text nodes and children
function localize_el(el) {
	// we don't want to mess with script tags
	if (el.tagName == "SCRIPT") {return}

	let attributes = el.getAttributeNames();

	// run through child nodes
	for (let i = 0; i < el.childNodes.length; i++) {
		// if the node isn't a text node, we do nothing
		if (el.childNodes[i].nodeType != Node.TEXT_NODE) {
			continue;
		}

		// the node is a text node, so we set its `.textContent` by
		// running `format_string()` on it
		el.childNodes[i].textContent =
			localize_string(el.childNodes[i].textContent)
	}

	// run through attributes and run `format_string()` on their values
	for (let i = 0; i < attributes.length; i++) {
		let attr = el.getAttribute(attributes[i]);
		el.setAttribute(attributes[i], localize_string(attr))
	}

	// run `replace_in_el()` on `el`'s children
	for (let i = 0; i < el.children.length; i++) {
		localize_el(el.children[i]);
	}
}

// localizes lang strings on (almost) all the elements inside `<body>`
module.exports = () => {
	localize_el(document.body);
}
