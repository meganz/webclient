#!/bin/bash
set -euo pipefail

me=$(realpath "$0")
path=$(dirname "$me")
root=$(realpath "${path}/../../../")
arcp="${root}/build/package"

declare -a root_files=(
  "aesasm.js"
  "worklet.js"
  "encrypter.js"
  "update.html"
  "pdf.worker.js"
  "mediainfo.mem"
)

fatal() {
  echo >&2 -e "fatal: $*\007"
  exit 127
}

sha256() {
  local file=$1
  sha256sum "$file" | cut -d' ' -f1
}

sha384() {
  local file=$1
  openssl dgst -sha384 -binary "$file" | openssl base64 -A
}

token() {
  openssl dgst -md5 -binary | openssl base64 -A | tr -cd '[:alnum:]'
}

ren() {
  local file=$1
  local tmp
  tmp=$(sha256 "$file")
  tmp=$(sed -E 's!\.(\w+)$!.'"$tmp"'.\1!' <<<"$file")
  mv "$file" "$tmp"
  echo -en "$(basename "$tmp")"
}

mod() {
  local file=$1
  local sha
  sha=$(sha256 "$file")
  local dec=$((16#${sha}))
  dec=$((dec % 2 ** 31))
  [ $dec -lt 0 ] && dec=$((dec + 2 ** 31))
  touch -d @"$dec" "$file"
}

cd "$root"
[[ -f "./secureboot.js" ]] || fatal "Invalid path (${root})"
[[ -d "./node_modules" ]] || npm install

if [[ -n $(git status -s) ]]; then
  make clean >/dev/null 2>&1
  [[ -z $(git status -s) ]] || fatal "You have unstaged changes, commit or stash them."
fi

./scripts/transifex.py
#./scripts/transifex.py --production

./node_modules/.bin/grunt --debug it | sed 's!^Done.!Please wait...!'

[[ -f "${arcp}/secureboot.js" ]] || fatal "Unexpected Grunt error?"

sed -i 's!<COMMIT_SHA>!'"$(git log -n 1 --pretty=format:"%h")"'!' "${arcp}/secureboot.js"

sha=$(sha384 "${arcp}/secureboot.js")
xid=$(echo -en "$sha" | token)

sed 's!secureboot.js"!secureboot.js?x='$xid'" integrity="sha384-'$sha'" crossorigin="anonymous"!' \
  ./js/ui/transfer/html/index.html >"${arcp}/index.html"

cp -rp ./js/ui/transfer/images/favicons "${arcp}/images"
cp -p "${arcp}/images/favicons/favicon.ico" "${arcp}"

xid=$(sha384 "${arcp}/favicon.ico" | token)
sed -i 's!favicon.ico"!favicon.ico?x='$xid'"!' "${arcp}/index.html"

for i in "${root_files[@]}"; do
  cp -p "${root}/$i" "${arcp}"
done

# -----------------------------------------------------------------------------------

cd "$arcp"
#find . -type f | while read -r file; do
#  mod "$file" &
#done
#wait

arc="${root}/"$(date +%Y%m%d.%s)
if which 7za >/dev/null; then
  arc="${arc}.7z"
  7za a -t7z -m0=lzma2 -mx9 -myx=9 -mtc -mta -mfb=256 -md=2048m -ms=on "${arc}" *
else
  arc="${arc}.tgz"
  tar -czf "${arc}" *
fi

cd "$root"
arc=$(ren "$arc")

echo ""
echo -en "Archive '${arc}' created, have a nice day!"
echo ""

git checkout -- .
make clean >/dev/null 2>&1
