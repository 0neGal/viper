# Publishing a new release

1. Make sure your code works!
2. Update `package.json` version
3. Make sure `package.json`'s `repository.url` key references correct repository
4. Ensure application builds correctly with `npm run build:[windows/linux]`
5. Expose `GH_TOKEN` environment var with your Github token
6. Build and publish with `npm run publish:[windows/linux]`
7. Edit the draft release message and publish the new release!