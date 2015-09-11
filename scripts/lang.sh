#!/bin/bash -x

# Get the current branch
currentBranch=$(git rev-parse --abbrev-ref HEAD)

# Checkout the translations branch
git checkout translations

# Make sure it's up to date
git pull

# Change to the lang directory
cd $(dirname $BASH_SOURCE)/../lang

# Remove the old tar.gz file from Babel
rm lang.tar.gz

# Fetch the latest translations from Babel
wget 'https://babel.mega.co.nz/?u=Jq1EXnelOeQpj7UCaBa1&id=fetch&' -O lang.tar.gz

# Extract the tar.gz file
tar xfvz lang.tar.gz

# Delete it
rm lang.tar.gz

# Add the .json files
git add .

# Commit it
git commit -m 'Updated strings from Babel'

# Push it to the translations branch
git push

# Check out the previous branch again
git checkout $currentBranch