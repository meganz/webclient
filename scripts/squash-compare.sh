#!/bin/bash
#
# This script is intended to see the changes between two squashed commits.
#
# Usage: scripts/squash-compare.sh <old-commit> <new-commit>
#    OR: scripts/squash-compare.sh --smart [branch]
#

file1=$(mktemp)
file2=$(mktemp)

prev=$1
last=$2

if [[ "$1" = "--smart" ]]; then
    [[ ! -z "$2" ]] && git checkout $2
    reflog=$(git log --reflog --oneline | grep "$(git log -1 --pretty=%B)" |  awk '{ print $1 }')
    prev=$(echo $reflog | awk '{ print $2 }')
    last=$(echo $reflog | awk '{ print $1 }')
fi

git diff develop...$prev >"$file1"
git diff develop...$last >"$file2"

diff -dB -u0 --color "$file1" "$file2" | grep -vE '^[-+]?@@'

rm "$file1"
rm "$file2"
