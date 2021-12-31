## What is Viper?

Viper is a launcher and updater for [Northstar](https://github.com/R2Northstar/Northstar), and not much more than that.

<p align="center">
  <img src="preview.png">
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

## What can it do specifically?

Currently Viper is capable of:

 * Updating/Installing Northstar
 * Launching Vanilla and or Northstar
 * Manage Mods (Soon, see **mod-support** branch)
 * Auto-Update itself (Soon, see **auto-updater** branch)
 * Be pretty!

Besides this I've been considering adding some easy to use VPK modding tools so everybody can have fun with VPK modding even if you don't know how to do it the traditional way. However that is not at the top of the todo list right now.

## Credits

All credits for logos go to Imply#9781.
