viper(1) -- update and manage northstar
=======================================

## SYNOPSIS

`viper` [<optional>...]

## DESCRIPTION

Viper is a program made to make updating and launching Northstar a lot easier. It has both a CLI and GUI tool, specifying no command line arguments opens the latter.

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

`--launch`=<version>
   Launches Northstar, this is currently only supported on Windows.
   If you must launch Vanilla you can run `--launch=vanilla`

`--setpath`=<absolute-path>
   Sets the game path, this'll change the `gamepath` variable in your `viper.json`, note that it only takes in absolute paths and not relative ones.

## CONFIGURATION

All configuration takes place in your `viper.json` file, this file may be in various locations depending on your platform, for Linux you're likely to find it at:

 * `$XDG_CONFIG_HOME/viper.json`
 * `~/.config/viper.json`

On Windows it's likely to be in `%APPDATA%\viper.json`

All configuration is done by Viper itself, the locale is auto set when the GUI launches through your systems locale, the gamepath is selected with `--setpath` or in the GUI.

## BUGS

Report bugs on the GitHub issues page, and feel free to make a pull request if you also have the fix to the bug.

## AUTHORS

Main contributors/maintainers to the project:

 * 0neGal <mail@0negal.com>
 * Rémy Raes <contact@remyraes.com>
