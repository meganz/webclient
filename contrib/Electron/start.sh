#!/bin/bash

pwd=$(pwd)
app=$pwd/app
wcp=$pwd/../..

if [ ! -d "$app" ]; then
    npm install
    mkdir -p $app
    ln -s $wcp/css $app
    ln -s $wcp/html $app
    ln -s $wcp/js $app
    ln -s $wcp/lang $app
    mkdir -p $app/images/mega
    ln -s $wcp/images/mega/loading-sprite*.png $app/images/mega
    ln -s $wcp/aesasm.js $app
    ln -s $wcp/rsaasm.js $app
    ln -s $wcp/decrypter.js $app
    ln -s $wcp/encrypter.js $app
    ln -s $wcp/nacl*.js $app
    ln -s $wcp/favicon.ico $app
    ln -s $wcp/index.js $app
    ln -s $wcp/keydec.js $app
    ln -s $wcp/keygen.js $app
    ln -s $wcp/index.html $app
    ln -s $wcp/secureboot.js $app
    ln -s $wcp/sjcl.js $app
fi

npm start

[[ "$1" = "clean" ]] && rm -r app
