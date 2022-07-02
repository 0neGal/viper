<p align="center">
	<img src="src/assets/icons/512x512.png" width="200px"><br>
	<a href="FAQ.md">FAQ</a> | 
	<a href="CONTRIBUTING.md">Contributing</a> | 
	<a href="https://github.com/0neGal/viper/releases">Releases</a><br>
</p>

## Contributing

Generally speaking, as Viper is a FOSS (GPLv3) project any bug reports, pull requests, or other types of help, forks are appreciated, but preferably unless it's off-topic to the goals of Viper, it would be far more appreciated if you were to make a pull request, or similar, and get it upstream.

**HOWEVER:** Before opening issues and pull requests and similar, please do read our <a href="CODE_OF_CONDUCT.md">code of conduct</a>, as to avoid issues.

### General contributions

If you're contributing, please follow <a href="CODE_OF_CONDUCT.md">code of conduct</a> as mentioned above, along with that please do not change code style. Viper uses double quotes, 1 tab per indent, and semicolons at the end of function calls.

`//` for 1-2 lines of comments, max of 72 comment text width always, preferably if textwidth outside of comments also exceeds 72 characters if possible find a way to make it fit within 72 characters. Lower case comments are also generally preferred when using `//`

`/* */` is useful in some cases, refer to the code example below.

`() => {}` is also preffered over `function () {}` when possible.

Single use functions are also generally discouraged, if a function is used once there's no need to make it a function.

As shown below below:

```javascript
function foo(bar) {
	/*
		This is a very long comment, however, it does not exceed 72
		characters, and instead wraps down so it fits nicely on a small
		screen without having to mess with soft-wrapping or similar.
	*/
	console.log(bar);
	// and this is a comment using "//",
	// which is two lines long
}

// examples of () => {}
setInterval(() => {
	foo("I RUN EVERY 1000MS");
}, 1000)
```

With the above information you should be able to comfortably make contributions without too much hassle...

### Localizing/Translating

Viper has a very simple i18n system, please read below for instructions.

#### Language file

The language file will be a file inside the `src/lang/` folder, name it according to the [ISO 3166-1 Alpha-2 standard](https://en.m.wikipedia.org/wiki/ISO_3166-1_alpha-2) in lowercase, meaning English = en, Spanish = es, French = fr, and so on.

Everything inside the file is pretty straight forward, the only special one is the `lang.title` string, please set this to `<language in english> - <language in native language>`, meaning for French it's, `French - Français`. This will be shown inside the language selection screen.

#### Maintainers file

If you're okay with being contacted in the future when new strings have to be localized please put your contact links inside this file, under your language. Preferably put the link to your GitHub profile as that is the easiest contact method for obvious reasons.
