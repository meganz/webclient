### Generated files used by the MEGA WebClient chat application.

---
**bundle.js** / **bundle.*.js**: The libraries and custom JavaScript/JSX files necessary for MEGAchat.

The architecture uses **Lazy Loading** (via React Suspense) to split the application into:
1.  `bundle.js`: The lightweight entry point.
2.  `bundle.*.js`: Lazy-loaded chunks (e.g., `bundle.call.js`, `bundle.contacts-panel.js`) loaded on-demand.

Lazy chunk loading is intercepted by `megaChunkLoader` to route requests through `secureboot`'s `M.require()`; this
ensures all chunks undergo strict XHR + SHA-256 hash verification before execution.

> NB: These unobfuscated, unminified files are created with Webpack using:
>
> ```bash
> npm update && npm install --production && ./scripts/build.sh
> ```

---
sfuClient.js: The [MEGA SFU client](https://github.com/meganz/sfu-client/) module for audio/video calls.

> NB: To build, fork the repo and run `./build.sh`.
> This build step also builds `worker.sfuClient.bundle.js` in the root directory.
