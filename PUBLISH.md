# Publishing a new release

 1. Make sure your code works!
 2. Update `package.json` version
 3. Make sure `package.json`'s `repository.url` key references correct repository
 4. Ensure application builds correctly with `npm run build:[windows/linux]`
 5. Expose `GH_TOKEN` environment var with your Github token (`build/publish.sh` asks for it)
 6. Build and publish with `npm run publish:[windows/linux]`
    - Optionally just use `build/publish.sh`, however that only works on Linux/Systems with a `/bin/sh` file, it also checks whether all files have been localized, and that the version numbers have been updated
 7. Edit the draft release message and publish the new release!
