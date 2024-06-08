// replaces strings in the HTML will language strings properly. This
// searches for %%<string>%%, aka, %%gui.exit%% will be replaced with
// "Exit", this works without issues.
module.exports = () => {
	// finds %%%% strings
	html = document.body.innerHTML.split("%%");

	for (let i = 0; i < html.length; i++) {
		// simply checks to make sure it is actually a lang string.
		if (html[i][0] != " " && 
			html[i][html[i].length - 1] != " ") {
			// Replaces it with it's string
			html[i] = lang(html[i]);
		}
	}
	
	// replaces the original HTML with the translated/replaced HTML
	document.body.innerHTML = html.join("");
}
