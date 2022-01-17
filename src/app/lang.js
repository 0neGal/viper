// Replaces strings in the HTML will language strings properly. This
// searches for %%<string>%%, aka, %%gui.exit%% will be replaced with
// "Exit", this works without issues.
function setlang() {
	// Finds %%%% strings
	html = document.body.innerHTML.split("%%");

	for (let i = 0; i < html.length; i++) {
		// Simply checks to make sure it is actually a lang string.
		if (html[i][0] != " " && 
			html[i][html[i].length - 1] != " ") {
			// Replaces it with it's string
			html[i] = lang(html[i])
		}
	}
	
	// Replaces the original HTML with the translated/replaced HTML
	document.body.innerHTML = html.join("");
}
