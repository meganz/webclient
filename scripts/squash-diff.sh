#! /bin/bash
set -e
#set -x

get_pipe_output() {
    $1 | $2
}
if [ "$1" == "--help" ]; then
    echo "Usage:"
    echo "$0 [--cleanup]"
    echo "If no argument is specified, performs squash on the current branch"
    echo -e "--cleanup Deletes the backup branches (if any) created when squashing\n the current branch"
    exit 0
elif [ "$1" == "--cleanup" ]; then
    shift 1
    iscleanup="1"
fi

branch=$(git symbolic-ref --short HEAD)
if [ "$branch" == "" ]; then
    echo "Error getting the name of the current branch, maybe you are in detached HEAD state?"
    exit 1
fi

archived_branch="$branch-archived-$(date +%s)"

if [ "$iscleanup" == "1" ]; then
    read -p $'Will cleanup backups of the current branch \e[91m'"$branch"$'\e[0m, please confirm[yN]: ' -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        echo "Script aborted"
        exit 1
    fi

    set +e
    archbranches=$(get_pipe_output "git branch" "grep $branch-archived-")
    set -e

    if [ "$archbranches" == "" ]; then
        echo "No archived branches present"
        exit 0
    fi
    echo -e "About to delete branches:\n$archbranches"
    read -p "Is it ok? " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        echo "Cleanup aborted"
        exit 1
    fi
    echo $archbranches | xargs git branch -D
    echo "Cleanup complete"
    exit 0
fi

read -p $'Will squash the current branch \e[91m'"$branch"$'\e[0m, please confirm[yN]: ' -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Script aborted"
    exit 1
fi

echo "Will save original branch under $archived_branch"

set +e
git update-index --refresh
git diff-index --quiet HEAD --
ret="$?"
set -e
if [ "$ret" != "0" ]; then
    echo "You have the following unstaged changes, please commit or stash them first"
    git status -s
    exit 1
fi

set +e
git rev-parse --verify --quiet "$archived_branch" 2>&1 > /dev/null
ret="$?"
set -e
if [ "$ret" != "1" ]; then
    echo "An archive branch with the name '$archived_branch' already exists"
    exit 128
fi

echo "Syncing develop...."
git fetch origin develop:develop

echo "Merging develop into $branch...."
set +e
git merge origin/develop
ret="$?"
set -e
if [ "$ret" != "0" ]; then
    echo "Probably there were merge conflicts. Please complete and commit the merge manually and re-run this script"
    exit 1
fi

echo "Rebuilding bundle.js"
./scripts/build.sh

set +e
git update-index --refresh
git diff-index --quiet HEAD --
ret="$?"
set -e
if [ "$ret" != "0" ]; then
    echo "bundle.js changed, committing update"
    git commit ./js/chat/bundle.js -S -m "Updated bundle.js"
else
    echo "bundle.js has no changes"
fi

# save $branch to $archived_branch
git checkout -b "$archived_branch"
# delete $branch
# Need -D instead of -d, because we are not in sunc with the remote branch,
# and git will abort, asking us to push our changes first
git branch -D "$branch"

# re-create $branch as a copy of develop
git checkout develop
git checkout -b "$branch"

#squash-merge original branch into new branch
git merge --squash "$archived_branch"
set +e
for (( ; ; ))
do
    git commit -S
    if [ "$?" == "0" ]; then
        break
    fi
    echo "Error committing changes, probably bad commit message. Please try again or press Ctrl+C to abort the script"
    sleep 2
done

echo "Replacing branch at remote...."
git push origin +"$branch"

echo -e "\033[32mSquash script finished successfully\033[0m"
