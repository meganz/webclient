#!/bin/bash
#
# This script is intended to squash all commits in the current branch.
#
# If the first argument is "p" or "push" it'll also push the changes.
#

target_branch=develop
current_branch=$(git symbolic-ref --short -q HEAD)

if [ "$current_branch" = "$target_branch" ]; then
    echo "Invalid Branch!"
    exit 1
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    if which gsed >/dev/null; then
        SED_BINARY="gsed"
    else
        echo "Found platform to be OSX, but gsed is missing. Please do install 'gsed'."
        exit 1;
    fi
else
    SED_BINARY="sed"
fi


SED_ARGS=' -i "2,\$s/pick/squash/"'
GIT_EDITOR="$SED_BINARY$SED_ARGS"  git rebase -i --autosquash $target_branch

if [ $? -ne 0 ]; then
    echo "Rebasing failed."
    exit $?
fi

if [ "$1" = "p" -o "$1" = "push" ]; then
    remote=$(git remote -v | grep "@code.developers.mega.co.nz:web/webclient.git (push)" | awk '{print $1}')
    if [ "$remote" = "" ]; then
        remote=origin
    fi
    git push -f $remote $current_branch
fi

exit $?
