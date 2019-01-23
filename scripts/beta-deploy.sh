#!/bin/bash
#
# A helper script to push recent commits to the GitLab server and then run the main beta
# deployment script to deploy the current branch to https://branch-name.developers.mega.co.nz.
# This is much faster than the dev_deploy.sh script which builds all the npm/React stuff.
#
# How to use:
# git commit -m '7733: My changes'     (Commit your changes as usual)
# ./scripts/beta-deploy.sh             (Run this script from the webclient directory)


# Change to the path of this script. This allows the script to be executed from multiple places.
# E.g. if executed via ./scripts/beta-deploy.sh or cd scripts && ./beta-deploy.sh they will both work.
currentScript=$(readlink -f "$0")
pathOfScript=$(dirname "$currentScript")

# Push the code to the GitLab server
echo "Running git push..."
git push

# Change into the scripts directory
cd "$pathOfScript"

# Run the main Fabric deploy script
fab dev:del_exist=True
