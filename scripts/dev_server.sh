#!/bin/sh
./node_modules/.bin/sass --load-path="css/" --watch css/chat-bundle.scss css/chat-bundle.css &
NODE_ENV="development" ./node_modules/.bin/webpack-dev-server --port 8089 --hot --debug --config webpack.config.js \
                                                                --history-api-fallback --inline $@
