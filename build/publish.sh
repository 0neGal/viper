#!/bin/sh

VERSION="v$(jq '.version' package.json -r)"
LOCK1="v$(jq '.version' package-lock.json -r)"
LOCK2="v$(jq '.packages[""].version' package-lock.json -r)"

REPO="$(jq '.repository.url' package.json -r | sed 's/.*.com\///g')"

REMOTEVERSION="$(curl --silent "https://api.github.com/repos/0neGal/viper/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')"

[ "$REMOTEVERSION" = "$VERSION" ] && {
	echo "A release already exists with the current version number!"
	exit 1
}

[ "$VERSION" != "$LOCK1" ] && {
	echo "Two seperate version numbers in package.json and package-lock.json"
	echo "  $VERSION, $LOCK1"
	exit 1
}

[ "$LOCK1" != "$LOCK2" ] && {
	echo "Version mismatches in package-lock.json"
	echo "  $LOCK1, $LOCK2"
	exit 1
}


node build/langs.js || {
	echo "Please fix localization errors before publishing..."
	exit 1
}

GH_TOKEN="$GH_TOKEN"

[ "$GH_TOKEN" = "" ] && {
	echo "GH_TOKEN is not set, please type it below:"
	read -p "> " GH_TOKEN
}

npm run publish
