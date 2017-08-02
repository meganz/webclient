#!/bin/bash
#
# This script checks out the 'translations' branch, then fetches the latest translation strings from Babel and updates
# the .json files in the /lang directory. Then it merges the 'translations' branch into your current branch.
#
# How to use:
#
# From inside your local webclient directory, run:
# ./scripts/lang.sh
#
# After that you are free to push the changes to the remote.


# Get the current branch
currentBranch=$(git rev-parse --abbrev-ref HEAD)

# Checkout the local translations branch
checkoutResult=$(git checkout translations)

# Check if the checkout succeeded
if [ $? -eq 0 ]; then

    # Clear any local changes and make sure it's up to date with the remote
    git reset --hard origin/translations
    git pull

    echo "Updated translations branch with latest changes from origin/translations."
else
    # If the checkout failed, fetch the branch from the remote server and check it out locally
    git fetch
    git checkout -b translations origin/translations

    echo "Created a new local translations branch based on the latest origin/translations."
fi

# Change to the lang directory
cd $(dirname $BASH_SOURCE)/../lang

# Fetch the latest translations from Babel
wget 'https://babel.mega.co.nz/?u=Jq1EXnelOeQpj7UCaBa1&id=fetch&' -O lang.tar.gz

# Check if the fetch failed
if [ $? -ne 0 ]; then

    # Check out the previous branch again
    git checkout $currentBranch
    git status

    echo "There was a problem fetching strings from Babel."
    echo "The language strings update was aborted and terminal is now returned to the $currentBranch branch."
    exit 1
fi

# Remove all files in the language directory (in case we removed some languages in the code)
rm *.json

# Extract the tar.gz file
tar xfvz lang.tar.gz

# Add the .json files
git add *.json

# Commit it
git commit -m 'Updated strings from Babel'

# Push it to the translations branch
git push -u origin translations

# Check out the previous branch again
git checkout $currentBranch

# Merge translations branch into the current branch
git merge translations -m "Merge branch 'translations' into $currentBranch"

# Check result of merge to see if it merged cleanly without conflicts
mergeResult=$(git ls-files -u)

# If there was a merge conflict
if [ -n "$mergeResult" ]; then
    echo "Problem merging, fetching strings from Babel again to resolve conflict..."
    git status

    # Extract the tar.gz file again
    tar xfvz lang.tar.gz

    # Mark conflict resolved and commit changes
    git add *.json
    git commit --no-edit

    echo
    echo "Conflicts resolved, you can now push the changes."
else
    echo
    echo "All merged, you can now push the changes."
fi

# Cleanup
rm lang.tar.gz

# Show all clear
git status
