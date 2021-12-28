html = document.body.innerHTML.split("%%");

for (let i = 0; i < html.length; i++) {
	if (html[i][0] != " " && 
		html[i][html[i].length - 1] != " ") {
		html[i] = lang(html[i])
	}
}

document.body.innerHTML = html.join("");
