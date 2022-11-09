### Generated files used by the MEGA WebClient chat application.


---
bundle.js: The libraries and custom JavaScript/JSX files (specified in webpack.config.js) necessary for MEGA chat.

> NB: This unobfuscated, unminified file is created with Webpack using:
>
> ```bash
> npm update && npm install --production && ./scripts/build.sh
> ```

---
sfuClient.js: The [MEGA SFU client](https://github.com/meganz/sfu-client/) module for audio/video calls.

> NB: To build, fork the repo and run `./build.sh`.
> This build step also builds `worker.sfuClient.bundle.js` in the root directory.
