# Publishing a new release

 1. Make sure your code works!
 2. Update `package.json` version
 3. Make sure `package.json`'s `repository.url` key references correct repository
 4. Ensure application builds correctly with `npm run build:[windows/linux]`
 5. Expose `GH_TOKEN` environment var with your Github token (`build/publish.sh` asks for it)
 6. Build and publish with `npm run publish:[windows/linux]`
    - Optionally just use `build/publish.sh`, however that only works on Linux/Systems with a `/bin/sh` file, it also checks whether all files have been localized, and that the version numbers have been updated
 7. Edit the draft release message and publish the new release!

## CI release

If you don't want to build releases yourself, you can make GitHub build them for you!

 1. Make sure your code works!
 2. Update `package.json` version
 3. Make sure `package.json`'s `repository.url` key references correct repository
 4. Ensure application builds correctly with `npm run build:[windows/linux]`
 5. Create a prerelease with newest version name
    - Creating the prerelease will trigger CI, that will build all executables
    - You can use build time to update release notes :)
 6. When all binaries have been uploaded to the prerelease, you can publish it!