#!/bin/sh
./node_modules/.bin/sass --load-path="css/" --watch css/chat-bundle.scss css/chat-bundle.css &
NODE_ENV="development" ./node_modules/.bin/webpack-dev-server --server-type https --config webpack.config.js
