#!/bin/bash
#
# This script is intended to see the changes between two squashed commits.
#
# Usage: scripts/squash-compare.sh <old-commit> <new-commit>
#

file1=$(mktemp)
file2=$(mktemp)

git diff develop...$1 >"$file1"
git diff develop...$2 >"$file2"

diff -dB -u1 --color "$file1" "$file2"
rc=$?

rm "$file1"
rm "$file2"

exit $rc
