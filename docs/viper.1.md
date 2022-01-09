viper(1) -- update and manage northstar
=======================================

## SYNOPSIS

`viper` [<optional>...]

## DESCRIPTION

Viper is a program made to make updating and launching Northstar a lot easier. It has both a CLI and GUI tool, specifying no command line arguments opens the latter. Viper also is able to update itself, that is if you've the AppImage or NSIS version.

## OPTIONS

`--help`
   Shows a brief message of all the options and what they do.

`--version`
   Various versions numbers for Node, Electron, Viper and so on.

`--cli`
   Forces the CLI to activate, meaning the GUI will never run. 
   What purpose this has I frankly do not know.

`--update`
   Updates Northstar, this uses your `viper.json` to determine the location, it also won't try to update if the installed version of Northstar is already the newest, if you must re-install Northstar you can delete the `ns_version.txt` file in the game path.

`--updatevp`
   Updates Viper itself, by default CLI does not have auto updates, as a server owner may not want this, so use this option to update.

`--launch`=<version>
   Launches Northstar, this is currently only supported on Windows.
   If you must launch Vanilla you can run `--launch=vanilla`

`--setpath`=<absolute-path>
   Sets the game path, this'll change the `gamepath` variable in your `viper.json`, note that it only takes in absolute paths and not relative ones.

`--mods`
   Lists out all installed mods, and gives a count on how many are installed, enabled and or disabled.

`--installmod`=<absolute-path>
   Installs a mod, this supports both Zip files and folders, just that the `mod.json` file is easily found is all that matters.

`--removemod`=<mod name>
   Removes a mod, the mod name should be taken from `--mods` as it provides accurate names. Putting in `allmods` will remove all mods, no confirmation.

`--togglemod`=<mod name>
   Toggles a mod, the mod name should be taken from `--mods` as it provides accurate names. Putting in `allmods` will toggle all mods. Keep in mind, if a mod is already disabled and some mods are enabled, the states will be flipped, so 3 enabled and 1 disabled, goes to 1 enabled and 3 disabled.

## CONFIGURATION

All configuration takes place in your `viper.json` file, this file may be in various locations depending on your platform, for Linux you're likely to find it at:

 * `$XDG_CONFIG_HOME/viper.json`
 * `~/.config/viper.json`

On Windows it's likely to be in `%APPDATA%\viper.json`

All configuration is done by Viper itself, the locale is auto set when the GUI launches through your systems locale, the gamepath is selected with `--setpath` or in the GUI.

## MOD SUPPORT

To toggle mods since Northstar itself has no filter as to what mods it loads, we have to move the mods into a separate folder, that folder being `disabled` inside `R2Northstar/mods`, so you can also just manually move these if you want.

## BUGS

Report bugs on the GitHub issues page, and feel free to make a pull request if you also have the fix to the bug.

## AUTHORS

Main contributors/maintainers to the project:

 * 0neGal <mail@0negal.com>
 * Rémy Raes <contact@remyraes.com>
