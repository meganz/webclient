#!/bin/bash
#
# The nuclear squashing option. This script creates a binary diff (to capture image files etc) between develop and the
# current branch. Then it will create a new branch based off that diff, add all the file changes to git in the current
# directory, commit them and push everything to the server as a new branch under the same name with -squashed appended
# to the branch name. If you do not want all files in the web directory added, try the squash-advanced.sh script
# instead. NB: This will nuke and replace any -squashed branch under the same name on the local host and remote server.
#
# How to use:
#
# First update your local copy of develop and merge that into your branch e.g.:
# git checkout develop
# git pull
# git checkout your-branch
# git merge develop (and fix any conflicts)
# git commit (retain any history about conflicts and the fixes)
# git push
#
# Now run this script e.g. ./scripts/squash-nuclear.sh.


# Change to the path of this script, then go up a level to the main web directory. This allows the script to be
# executed from multiple places and still capture all the code changes in the main web directory. E.g. if executed via
# ./scripts/squash-advanced.sh or cd scripts && ./squash-advanced.sh they will both work.
currentScript=$(readlink -f "$0")
pathOfScript=$(dirname "$currentScript")
cd "$pathOfScript"
cd ..

# Find the current branch
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

git push origin :$current_branch-squashed
git branch -d -f $current_branch-squashed
echo
echo "3. Deleted $current_branch-squashed branch if it existed"
echo "---"

git checkout -b $current_branch-squashed
echo
echo "4. Created new branch $current_branch-squashed"
echo "---"

git apply $current_branch.diff
rm $current_branch.diff
git status
echo
echo "5. Applied $current_branch.diff"
echo "---"

git add .
echo
echo "6. Added files. Enter commit message for the squashed branch (e.g. 5163: Ticket title):"
read commitMessage

git commit -m "$commitMessage"
git push -u origin $current_branch-squashed
echo
echo "7. Pushed new branch $current_branch-squashed. All done."
echo "---"
