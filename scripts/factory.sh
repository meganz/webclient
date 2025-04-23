#!/bin/bash
#
# Scan factory files and inject 'em into secureboot...
#
set -euo pipefail

SED="sed"
SEPARATOR="// Key Management."

# If OSX, use gsed
if [[ "$OSTYPE" == "darwin"* ]]; then
    if which gsed >/dev/null; then
        SED="gsed"
    elif ! which sed >/dev/null; then
        echo "Found platform to be OSX, but gsed is missing. Please do install 'gsed'."
        exit 1;
    fi
fi

me=$(realpath "$0")
dir=$(dirname "$me")
sbjs="$dir/secureboot.js"
[[ -f "$sbjs" ]] || sbjs=$(dirname "$dir")"/secureboot.js"

n=$(grep -n "$SEPARATOR" "$sbjs" | awk -F':' '{print$1}')

temp=$(mktemp)
fldn="factory"
path="js/utils/"$fldn
head -n$((n-1)) "$sbjs" | grep -vE "$path" >"$temp"

jsl=""
for f in $(dirname "$sbjs")"/$path/"*; do
    file=$(basename "$f")
    name=$($SED 's!-!!;s!\.!_!g' <<< "$file")
    jsl+="    jsl.push({f:'$path/$file', n: '$fldn:$name', j:1});\n"
done

echo -ne "$jsl" >> "$temp"
$SED -n "$n,$ p" "$sbjs" >> "$temp"

mv -f "$temp" "$sbjs"
