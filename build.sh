#!/bin/bash
NODE_ENV="production" ./node_modules/.bin/webpack -p --content-base .   --output-file  bundle.js --output-source-map-file bundle.js.sourcemap