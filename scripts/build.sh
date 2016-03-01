#!/bin/bash
NODE_ENV="production" ./node_modules/.bin/webpack  --config webpack.config.js

build_file=js/chat/bundle.js
temp_file1=/tmp/chat-bundle1.js
temp_file2=/tmp/chat-bundle2.js

# Replace `createElement` calls so that the AMO Validator doens't freaks out..
cat $build_file \
    | sed 's/createElement:/makeElement:/' \
    | sed -re 's/(React\w*)\.createElement/\1.makeElement/' > $temp_file1

# When removing unused code, it is ok to get rid of these function calls.
# (I.e: for `Side effects in initialization of unused variable` reports)
UJS_PUREFUNCS=,pure_funcs=\'\$,String,getDeclarationErrorAddendum\'

# UglifyJS's compress and beautify parameters
UJS_COMPRESS_OPTIONS=pure_getters,sequences=false,if_return=false,join_vars=false$UJS_PUREFUNCS
UJS_BEAUTIFY_OPTIONS=indent-level=2,width=120,bracketize,quote_style=1

uglifyjs -c $UJS_COMPRESS_OPTIONS -b $UJS_BEAUTIFY_OPTIONS --stats --screw-ie8 -o $temp_file2 $temp_file1

cp -f $temp_file2 $build_file
