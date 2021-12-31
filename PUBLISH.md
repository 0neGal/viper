# Publishing a new release

1. Make sure your code works!
2. Update `package.json` version
3. Make sure `package.json`'s `repository.url` key references correct repository
4. Expose `GH_TOKEN` environment var with your Github token
5. Run `npx electron-builder -p always`
6. Build and upload non-auto-updating packages to newly-created release