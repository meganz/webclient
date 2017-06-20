#!/bin/bash

# Get the current branch
currentBranch=$(git rev-parse --abbrev-ref HEAD)

# Checkout the translations branch
git checkout translations

# Make sure it's up to date
git pull

# Change to the lang directory
cd $(dirname $BASH_SOURCE)/../lang

# Remove all files in the language directory (in case we removed some languages in the code)
rm *.json
rm lang.tar.gz

# Fetch the latest translations from Babel
wget 'https://babel.mega.co.nz/?u=Jq1EXnelOeQpj7UCaBa1&id=fetch&' -O lang.tar.gz

# Extract the tar.gz file
tar xfvz lang.tar.gz

# Add the .json files
git add *.json

# Commit it
git commit -m 'Updated strings from Babel'

# Push it to the translations branch
git push

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
