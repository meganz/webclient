#!/bin/bash
#
# The nuclear squashing option. This script creates a binary diff (to capture image files etc) between develop and the
# current branch. Then it will create a new branch based off that diff, add all the file changes to git in the current
# directory, commit them and push everything to the server as a new branch under the same name with -squashed appended
# to the branch name. If you do not want all files in the web directory added, try the squash-advanced.sh script
# instead.
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

if [[ "$OSTYPE" == "darwin"* ]]; then
    if which greadlink >/dev/null; then
        READLINK_BINARY="greadlink"
    else
        echo "Found platform to be OSX, but greadlink is missing. Please do install 'greadlink'."
        exit 1;
    fi
else
    READLINK_BINARY="readlink"
fi

# Change to the path of this script, then go up a level to the main web directory. This allows the script to be
# executed from multiple places and still capture all the code changes in the main web directory. E.g. if executed via
# ./scripts/squash-nuclear.sh or cd scripts && ./squash-nuclear.sh they will both work.
currentScript=$($READLINK_BINARY -f "$0")
pathOfScript=$(dirname "$currentScript")
cd "$pathOfScript"
cd ..

# Find the current branch
target_branch=develop
current_branch=$(git symbolic-ref --short -q HEAD)

remote=$(git remote -v | grep "@code.developers.mega.co.nz:web/webclient.git (push)" | awk '{print $1}')
if [ "$remote" = "" ]; then
    remote=origin
fi

if [ "$current_branch" = "$target_branch" ]; then
    echo "Invalid Branch!"
    exit 1
fi

# Checkout develop branch
git checkout $target_branch
echo
echo "1. Checked out branch $target_branch"
echo "---"

# Create a binary diff between current develop and the current branch (binary diff captures image changes too)
git diff $target_branch..$current_branch --binary >$current_branch.diff
echo
echo "2. Created diff between $target_branch and $current_branch and saved as $current_branch.diff"
echo "---"

# Try checking out a new -squashed branch
git checkout -b $current_branch-squashed

# If the checkout succeeded, all good
if [ $? -eq 0 ]; then
    echo
    echo "3. Created new branch $current_branch-squashed"
    echo "---"
else
    # Otherwise delete the local branch (but not the remote branch). This is done to preserve commit history in GitLab
    # because deleting the remote squashed branch and remaking loses history
    git branch -D $current_branch-squashed
    git checkout -b $current_branch-squashed
    echo
    echo "3. Delete of local $current_branch-squashed complete and created new local branch under same name"
    echo "---"
fi

# Apply the diff of changes to the current develop
git apply $current_branch.diff
rm $current_branch.diff
git status
echo
echo "4. Applied $current_branch.diff"
echo "---"

# Add all the files and read in a commit message for the squashed branch
git add .
echo
echo "5. Added files. Enter commit message for the squashed branch (e.g. 5163: Ticket title):"
read commitMessage

# Commit the changes and try push as a new squashed branch
git commit -m "$commitMessage"
git push -u $remote $current_branch-squashed

# If the push succeeds, then the -squashed branch didn't exist on origin so all good
if [ $? -eq 0 ]; then
    echo
    echo "6. Pushed new branch $current_branch-squashed. All done."
    echo "---"
else
    echo
    echo "6. Branch already exists on origin. Force pushing squashed branch $current_branch-squashed instead..."
    echo "---"

    # If the push failed then the squashed branch already exists on origin so force push the changes
    # This will retain one single commit on the -squashed branch and retain the history of recent changes on GitLab
    git push -f $remote $current_branch-squashed
    echo
    echo "7. Force push updated branch $current_branch-squashed. All done."
    echo "---"
fi
