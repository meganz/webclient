#!/bin/bash
#
# This script is intended to create a binary diff (to capture image files etc) between develop and the current branch.
# Then it will create a new branch based off that diff. It will be the user's responsibility to add the files they want
# then push it manually to the server.
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
# Now run this script e.g. ./scripts/squash-advanced.sh and follow any prompts.


# Change to the path of this script, then go up a level to the main web directory. This allows the script to be
# executed from multiple places and still capture all the code changes in the main web directory. E.g. if executed via
# ./scripts/squash-advanced.sh or cd scripts && ./squash-advanced.sh they will both work.
currentScript=$(stat -f "$0")
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
    echo "4. Created new branch $current_branch-squashed"
    echo "---"
else
    # Otherwise reset the branch back to prior commit (should be same as current develop now)
    # This is done to preserve commit history in GitLab because deleting the squashed branch and remaking loses history
    git checkout $current_branch-squashed
    git reset --hard HEAD^
    echo
    echo "4. Reset of origin/$current_branch-squashed back to prior commit complete"
    echo "---"
fi

# Apply the diff of changes to the current develop
git apply $current_branch.diff
rm $current_branch.diff
git status
echo
echo "5. Applied $current_branch.diff"
echo "---"

# Let the user add files to the commit in another terminal
echo "6. In another terminal, add the files you want to be added to the squashed commit (e.g. git add index.js)"
read -rsp $'Then press Enter to continue...\n'

# Read in a commit message
echo
echo "7. Enter commit message for the squashed branch (e.g. 5163: Ticket title):"
read commitMessage

# Commit the changes and try push as a new squashed branch
git commit -m "$commitMessage"
git push -u origin $current_branch-squashed

# If the push succeeds, then the -squashed branch didn't exist on origin so all good
if [ $? -eq 0 ]; then
    echo
    echo "8. Pushed new branch $current_branch-squashed. All done."
    echo "---"
else
    echo
    echo "8. Branch already exists on origin. Force pushing squashed branch $current_branch-squashed instead..."
    echo "---"

    # If the push failed then the squashed branch already exists on origin so force push the changes
    # This will retain one single commit on the -squashed branch and retain the history of recent changes on GitLab
    git push -f origin $current_branch-squashed
    echo
    echo "9. Force push updated branch $current_branch-squashed. All done."
    echo "---"
fi
