<p align="center">
	<img src="src/assets/icons/512x512.png" width="200px"><br>
	<a href="https://github.com/0neGal/viper/releases/download/v1.2.5/Viper-Setup-1.2.5.exe"><img src="assets/download.png" width="300px"></a><br>
	<a href="https://github.com/0neGal/viper/projects/1">Overview</a> | 
	<a href="https://github.com/0neGal/viper/releases">Releases</a><br>
</p>

## What is Viper?

Viper is a launcher and updater for [Northstar](https://github.com/R2Northstar/Northstar), and not much more than that.

## Install

Downloads are available on the [releases page](https://github.com/0neGal/viper/releases/latest). 

Please note that some versions will update themselves automatically when a new release is available (just like Origin or Steam) and some will NOT, so choose it accordingly. Only the AppImage and Windows Setup/Installer can auto-update.

**Windows:** [`Viper Setup [x.y.z].exe`](https://github.com/0neGal/viper/releases/download/v1.2.5/Viper-Setup-1.2.5.exe) (auto-updates, and is recommanded), [`Viper [x.y.z].exe`](https://github.com/0neGal/viper/releases/download/v1.2.5/Viper-1.2.5.exe) (single executable, no fuss)

**Linux:** [`.AppImage`](https://github.com/0neGal/viper/releases/download/v1.2.5/Viper-1.2.5.AppImage) (auto-updates), [`.deb`](https://github.com/0neGal/viper/releases/download/v1.2.5/viper-1.2.5_amd64.deb), [`.rpm`](https://github.com/0neGal/viper/releases/download/v1.2.5/Viper-1.2.5.x86_64.rpm), [`.tar.gz`](https://github.com/0neGal/viper/releases/download/v1.2.5/Viper-1.2.5.tar.gz)

## What can it do specifically?

<p>
Currently Viper is capable of:

<img src="assets/preview.png" align="right" width="50%">

 * Updating/Installing Northstar
 * Launching Vanilla and or Northstar
 * Manage Mods
 * Auto-Update itself 
 * Be pretty!

Besides this I've been considering adding some easy to use VPK modding tools so everybody can have fun with VPK modding even if you don't know how to do it the traditional way. However that is not at the top of the todo list right now.
</p>

## Configuration

All settings take place in the settings page, found in the top right corner of the app, where you can disable auto-updates, and other related settings. You can also manually go in and edit your config file (`viper.json`), if you feel so inclined.

Your configuration file will be found in `%APPDATA%\viper.json` on Windows, and inside either `~/.config` or through your environment variables (`$XDG_CONFIG_HOME`) on Linux, the latter has priority.

## Contact/Support

To get support either open a GitHub issue.<br>
Or if you must you can contact a developer through the methods below:

Ways to contact the main developer: [0neGal](https://github.com/0neGal)
 * Twitter: [@0neGal](https://twitter.com/0neGal)
 * Reddit: [/u/0neGal](https://reddit.com/u/0neGal)

### Frequently Asked Questions (FAQ)

Many of the questions and problems you may have might be able to be answered by reading the [FAQ page](FAQ.md). So before opening an issue or asking for support please read through it first!

## Sidenote

Given that we already have so many Northstar updaters and launchers I urge people to instead of creating new launchers unless there's a very specific reason, just make a pull request on one of the existing, otherwise we'll continue to have new ones.

<p align="center">
	Relevant xkcd:<br>
	<img src="assets/xkcd.png">
</p>

Some of the existing launchers are listed below:
 * Viper - A launcher with an easy to use GUI and CLI albeit missing some features
 * [Ronin](https://github.com/MindSwipe/ronin) - a CLI only updater
 * [laundmo's updater](https://github.com/laundmo/northstar-updater) - another CLI only updater
 * [Juicy's mod manager](https://github.com/BigSpice/NorthStar-Mod-Manager-Ext-1) - an updater and manager for mods, most feature rich

## Development

If you wanna edit Viper's code and run it and so on, you can simply do something along the lines of the below:

```sh
$ git clone https://github.com/0neGal/viper

$ cd viper

$ npm i

$ npm run start
```

This'll launch it with the Electron build installed by `npm`.

Additionally, if you're creating your own fork you easily publish builds and or make builds with either `npm run publish` or `npm run build` respectively, the prior requiring a `$GH_TOKEN` to be set, as it creates the release itself so it needs a token with access to your repo. So you'd do something along the lines of:

```sh
$ GH_TOKEN="<your very long, private and wonderful token>" npm run publish
```

Keep in mind building all Linux builds may take a while on some systems as packaging the `tar.gz` release can take a while on many CPU's, at least from my testing. All other builds should be done quickly. When using the `publish` command it also automatically uploads the needed files to deploy auto-updates, keep in mind you'd need to have the `repository` setting changed to your new fork's location, otherwise it'll fetch from the original.

## Credits

**Logo:** Imply#9781<br>
**Viper Background:** [Uber Panzerhund](https://www.reddit.com/r/titanfall/comments/fwuh2x/take_to_the_skies)<br>
**Titanfall+Northstar Logo:** [Aftonstjarma](https://www.steamgriddb.com/logo/47851)
