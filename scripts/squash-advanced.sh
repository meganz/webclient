#!/bin/bash
#
# This script is intended to create a binary diff between develop and the current branch.
# Then it will create a new branch based off that diff and push it to the server.
#

target_branch=develop
current_branch=$(git symbolic-ref --short -q HEAD)

if [ "$current_branch" = "$target_branch" ]; then
    echo "Invalid Branch!"
    exit 1
fi

git checkout $target_branch
echo
echo "1. Checked out branch $target_branch"
echo "---"

git diff $target_branch..$current_branch --binary >$current_branch.diff
echo
echo "2. Created diff between $target_branch and $current_branch and saved as $current_branch.diff"
echo "---"

git checkout -b $current_branch-squashed
echo
echo "3. Created new branch $current_branch-squashed"
echo "---"

git apply $current_branch.diff
echo
echo "4. Applied $current_branch.diff"
echo "---"

rm $current_branch.diff
git add .
git status

echo "5. Ready to commit and push with git push -u origin $current_branch-squashed"
echo "---"