## What is Viper?

Viper is a launcher and updater for [Northstar](https://github.com/R2Northstar/Northstar), and not much more than that.

<p align="center">
	<img src="assets/preview.png">
</p>

## How to?

Currently Viper is in a state where I dont have release builds ready for people to download, instead if you really do wanna play with it, you can run it with Node... Simply do as follows:

```sh
$ git clone https://github.com/0neGal/viper

$ cd viper

$ npm i

$ npm run start
```

This'll launch it with the Electron build installed by `npm`.

Additionally, if you really want to, you can build Viper with `npm run build` and it'll then build the Windows installer and AppImage, however the whole build process and everything related to it is still being worked on which is why we don't have official releases yet.

## Install

(this will be relevant once we start to publish releases)

Downloads are available on the [releases page](https://github.com/0neGal/viper/releases/latest). 

Please note that some versions will (*[soon™](https://github.com/0neGal/viper/tree/auto-updates)*) update themselves automatically when a new release is available (just like Origin or Steam) and some will NOT, so choose it accordingly. Only the AppImage and Windows Setup/Installer can auto-update.

**Windows:** `Viper Setup [x.y.z].exe` (auto-updates, and is recommanded), `Viper [x.y.z].exe` (single executable, no fuss)

**Linux:** `.AppImage` (auto-updates), `.deb`, `.rpm`, `.snap`, `.tar.gz`

## What can it do specifically?

Currently Viper is capable of:

 * Updating/Installing Northstar
 * Launching Vanilla and or Northstar
 * Manage Mods (Soon, see [**mod-support**](https://github.com/0neGal/viper/tree/mod-support) branch)
 * Auto-Update itself (Soon, see [**auto-updater**](https://github.com/0neGal/viper/tree/auto-updates) branch)
 * Be pretty!

Besides this I've been considering adding some easy to use VPK modding tools so everybody can have fun with VPK modding even if you don't know how to do it the traditional way. However that is not at the top of the todo list right now.

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


## Credits

All credits for logos go to Imply#9781.
