// change platform icon in "Download!" button if on Linux
if (navigator.userAgent.match("Linux")) {
	document.querySelector("button img").src = "images/linux.png";
}

// functionality of "Download!" button
document.querySelector("button").addEventListener("click", () => {
	// if on Linux, navigate to .AppImage file
	if (navigator.userAgent.match("Linux")) {
		return location.replace("?appimage");
	}

	// if not on Linux, navigate to .exe setup file
	location.replace("?win-setup");
})

// how many wallpapers are in images/backgrounds/
let backgrounds = 7; 

// initializes the elements for the backgrounds
function init_backgrounds() {
	// run through `backgrounds`
	for (let i = 2; i < backgrounds + 1; i++) {
		// create background element
		let background = document.createElement("div");

		// add relevant classes
		background.classList.add("image");

		// set `background-image` CSS property
		background.style.backgroundImage =
			`url("images/backgrounds/${i}.jpg")`;

		// add image to DOM
		document.querySelector(".background .images").appendChild(
			background
		)
	}
}; init_backgrounds()

// changes the current image to a random image, if the image picked is
// the same as the one currently being shown, then we re-run this
// function, aka duplicates do not happen!
function change_background() {
	// get the ID for the new image
	let new_image = Math.floor(Math.random() * (backgrounds - 2) + 1);
	// get list of image elements
	let images = document.querySelector(".background .images").children;

	// if the new images is the current images, cancel and re-run
	if (images[new_image] ==
		document.querySelector(".background .images .active")) {

		return change_background();
	}

	// run through the images
	for (let i = 0; i < images.length; i++) {
		// if we're at the new active image, make it active
		if (i == new_image) {
			images[i].classList.add("active");
			continue;
		}

		// remove any possible `.active` class from this image
		images[i].classList.remove("active");
	}
}

// makes the initial (Viper) background/image animate on page load
document.addEventListener("DOMContentLoaded", () => {
	let image = document.querySelector(".image.active-noanim");

	image.classList.add("active");
	image.classList.remove("active-noanim");
})

// change wallpaper every 5 seconds
setInterval(change_background, 5000);
