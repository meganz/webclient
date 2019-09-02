#!/bin/sh
NODE_ENV="development" ./node_modules/.bin/webpack-dev-server --port 8089 --hot --debug --config webpack.config.js \
                                                                --history-api-fallback --inline $@
