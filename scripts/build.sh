#!/bin/bash

build_file=js/chat/bundle.js
temp_file1=/tmp/chat-bundle1.js

if [[ "$1" == "--fix" ]]; then
    # merge develop in, dealing with bundle.js conflicts
    remote=$(git remote -v | grep "@code.developers.mega.co.nz:web/webclient.git (push)" | awk '{print $1}')
    if [ "$remote" = "" ]; then
        remote=origin
    fi
    git checkout develop -- $build_file
    git commit -m "develop-bundle"
    git pull $remote develop
fi

if [ -n "$(git status --porcelain|grep scss)" -o "$1" == "--force" ]; then
    ./node_modules/.bin/sass --load-path="css/" --no-source-map css/chat-bundle.scss css/chat-bundle.css
    [[ $? -ne 0 ]] && exit 127
fi

NODE_ENV="production" ./node_modules/.bin/webpack  --config webpack.config.js

# If OSX, use gsed
if [[ "$OSTYPE" == "darwin"* ]]; then
    if which gsed >/dev/null; then
        SED_BINARY="gsed"
    # as we forbidden to use brew, gsed is unable to install but normal sed
    elif which sed >/dev/null; then
        SED_BINARY="sed"
    else
        echo "Found platform to be OSX, but gsed is missing. Please do install 'gsed'."
        exit 1;
    fi
else
    SED_BINARY="sed"
fi

cat $build_file \
    | $SED_BINARY -E 's!_babel_runtime_helpers_(\w+)__WEBPACK_IMPORTED_MODULE_!_\1!g' \
    | $SED_BINARY 's!__WEBPACK_IMPORTED_MODULE_!!g' \
    | $SED_BINARY 's!__unused_webpack_module!_!g' \
    | $SED_BINARY 's!__unused_webpack_!!g' \
    | $SED_BINARY 's!__webpack_exports__!EXP_!g' \
    | $SED_BINARY 's!__webpack_require__!REQ_!g' \
    | $SED_BINARY 's!external_React_default!REaCt!g' \
    | $SED_BINARY -E 's!\bexternal_+|_+default\b!!g' \
    | $SED_BINARY -E 's!.*webpackMissingModule.*!!g' \
    | $SED_BINARY -E 's!_?inheritsLoose(_default|[0-9]+)\(\)!inherits!g' \
    | $SED_BINARY -E 's!_?assertThisInitialized(_default|[0-9]+)\(\)!!g' \
    | $SED_BINARY -E 's!(cache__\s*=|exports\s*:)\s*\{\}!\1Object.create(null)!g' \
    | $SED_BINARY -E 's!/\*+\*/\s?!!g' \
    | $SED_BINARY -E 's!/\*[^*]+\*/\s*!!g' > $temp_file1
[[ $? -ne 0 ]] && exit 15

mv $temp_file1 $build_file
[[ $? -ne 0 ]] && exit 23

echo -n "Applying ESLint fixes, please be patient..."
time ./node_modules/.bin/eslint --no-eslintrc --quiet --fix --no-ignore --env es2018 \
    --rule "object-shorthand:2,dot-notation:2,no-var:2,no-extra-parens:2" \
    --rule "prefer-const:2,prefer-arrow-callback:2,prefer-destructuring:2" \
    --rule "prefer-spread:2,prefer-template:2,no-unneeded-ternary:2" \
    ./$build_file >/dev/null

if [[ "$1" == "--fix" ]]; then
    git commit -a -m "chat/bundle.js update"
    git push $remote $(git symbolic-ref --short -q HEAD)
fi

exit $?
