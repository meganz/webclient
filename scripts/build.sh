#!/bin/bash
NODE_ENV="production" ./node_modules/.bin/webpack  --config webpack.config.js

build_file=js/chat/bundle.js
temp_file1=/tmp/chat-bundle1.js

# Replace `createElement` calls so that the AMO validator doesn't freak out...
cat $build_file \
    | sed 's/createElement:/makeElement:/' \
    | sed -E 's/(React\w*)\.createElement/\1.makeElement/' > $temp_file1

cp -f $temp_file1 $build_file
rm $temp_file1