#!/bin/bash
#
# This script is intended to squash all commits in the current branch.
#
# Use -h for help.
#
# $Id: squash.sh,v 2.1.0 2020/11/06 18:42:16 dc Exp $

ask() {
    read -r -n 1 -p "$1 [Yn]: "
    [[ $REPLY =~ ^[Nn]$ ]] && return 1 || return 0
}

fatal() {
    echo >&2 -e "fatal: $*\007"
    exit 128
}

get_firstcommit() {
    sha=$(git log --no-merges --oneline --format=%H $1 | tail -1)
    git show $sha --pretty=%B --no-patch | $SED_BINARY 's/^WEB-/#/; s/:\s\w\+:/:/'
}

get_binary() {
    echo "$1"
}

if [[ "$OSTYPE" == "darwin"* ]]; then
    get_binary() {
        if which "g$1" >/dev/null 2>&1; then
            echo "g$1"
        elif which "$1" >/dev/null 2>&1; then
            echo "$1"
        else
            echo >&2 "'$1' not found, please install it."
            exit 1;
        fi
    }
fi

while [ $# -gt 0 ]; do
    case "$1" in
        -h|-help)
            echo "Usage: $0 [options] [source-branch]"
            echo
            echo "Options:"
            echo "-t <branch>     Target branch (default: develop)"
            echo "-b <branch>     Source branch (default: current)"
            echo "-r <remote>     Remote to use (default: origin)"
            echo "-m <message>    New commit message (preserving co-authors)"
            echo "-u              Pull target branch before squashing."
            echo "-p              Push changes after squashing."
            echo "-a              Reset commit author."
            echo "-s              Sign commit off."
            echo "-g              Abort if there are unstaged changes."
            echo "-n              Do not prompt on failed rebasing, exit."
            echo "-y              Reply yes to any prompt, i.e to proceed with soft-reset."
            exit 1
            ;;
        -t|-target)
            shift
            target_branch=$1
            ;;
        -b|-branch)
            shift
            source_branch=$1
            ;;
        -r|-remote)
            shift
            remote=$1
            ;;
        -m|-message)
            shift
            opt_message=$1
            ;;
        -p|-push)
            opt_push=1
            ;;
        -u|-pull)
            opt_pull=1
            ;;
        -a|-reset-author)
            opt_resetauthor=1
            ;;
        -s|-signoff)
            opt_signoff=1
            ;;
        -n|-silent)
            opt_silent=1
            ;;
        -y|-yes)
            opt_yes=1
            ;;
        -g|-good)
            [[ -n $(git status -s) ]] && fatal "You have unstaged changes, commit or stash them."
            ;;
        -*)
            fatal "Unknown option: $1"
            ;;
        *)
            break
            ;;
        esac
    shift
done

SED_BINARY=$(get_binary "sed") || exit 1
AWK_BINARY=$(get_binary "awk") || exit 1
GREP_BINARY=$(get_binary "grep") || exit 1

current_branch=$(git symbolic-ref --short -q HEAD)

[[ -z "$source_branch" ]] && source_branch=$1
[[ -z "$target_branch" ]] && target_branch=develop
[[ -z "$source_branch" ]] && source_branch=$current_branch

[[ -z $(git rev-parse --quiet --verify "$source_branch") ]] && fatal "Invalid source branch: $source_branch"
[[ -z $(git rev-parse --quiet --verify "$target_branch") ]] && fatal "Invalid target branch: $target_branch"

[[ "$source_branch" = "develop" ]] && fatal "You are in develop."
[[ "$source_branch" = "$target_branch" ]] && fatal "Source and target branch cannot be the same."

if [ -z "$remote" ]; then
    remote=$(git remote -v | $GREP_BINARY "$(git ls-remote --get-url) (push)" | $AWK_BINARY '{print $1}')
    [[ -z "$remote" ]] && remote=origin
fi

if [ "$opt_pull" = "1" ]; then
    git checkout $target_branch
    [[ $? -ne 0 ]] && fatal "$target_branch checkout failed."

    git fetch -pa
    [[ $? -ne 0 ]] && fatal "fetch failed."

    git pull $remote $target_branch
    [[ $? -ne 0 ]] && fatal "$target_branch pull failed."

    git checkout $source_branch
    [[ $? -ne 0 ]] && fatal "$source_branch checkout failed."

    git pull $remote $target_branch
    [[ $? -ne 0 ]] && fatal "$target_branch merge failed."
else
    git checkout $source_branch 2>/dev/null
    [[ $? -ne 0 ]] && fatal "$source_branch checkout failed."
fi

path=$target_branch..$source_branch
author=$(git log --no-merges --oneline --format="%an <%ae>" $path | tail -1)
coauthor=$(git shortlog -se --no-merges $path | $GREP_BINARY -ve "$author" | $AWK_BINARY '{$1=""; print "Co-authored-by:"$0}')

[[ -n "$coauthor" ]] && commit_message=$(get_firstcommit $path)$'\n\n'$coauthor

SED_ARGS=' -i "2,\$s/pick/fixup/"'
GIT_EDITOR="$SED_BINARY$SED_ARGS"  git rebase -i --autosquash $target_branch

if [ $? -ne 0 ]; then
    git rebase --abort >/dev/null 2>&1
    [[ "$opt_silent" = "1" ]] && fatal "Rebasing failed."

    if [ -z "$opt_yes" ]; then
        ask "Rebasing failed, try soft-reset approach instead?" || exit 128
    fi

    [[ -z "$commit_message" ]] && commit_message=$(get_firstcommit $path)

    git reset --soft $remote/$target_branch
    [[ $? -ne 0 ]] && fatal "soft-reset failed, aborting..."

    git commit --author="$author" -a -m "$commit_message"
    [[ $? -ne 0 ]] && fatal "commit failed, aborting..."
    commit_message=
fi

if [[ -n "$commit_message" ]]; then
    git commit --amend --no-edit -m "$commit_message"
    [[ $? -ne 0 ]] && fatal "commit amend failed."
fi

if [[ "$opt_resetauthor" = "1" ]]; then
    git commit --amend --no-edit --reset-author
    [[ $? -ne 0 ]] && fatal "reset-author failed."

    [[ -z "$opt_message" ]] && opt_message=fix
    coauthorr="Co-authored-by: $author"
fi

if [[ -n "$opt_message" ]]; then
    if [[ "$opt_message" = "fix" ]]; then
        opt_message=$(get_firstcommit $path)
        if [[ -n "$coauthorr" ]]; then
            opt_message=$opt_message$'\n'$coauthorr
        fi
    elif [[ -n "$coauthor" ]]; then
        opt_message=$opt_message$'\n\n'$coauthor
    fi
    git commit --amend --no-edit -m "$opt_message"
    [[ $? -ne 0 ]] && fatal "amend commit message failed."
fi

if [[ "$opt_signoff" = "1" ]]; then
    git commit --amend --no-edit -s -S >/dev/null 2>&1
    [[ $? -ne 0 ]] && fatal "signoff failed."
fi

if [[ "$opt_push" = "1" ]]; then
    git push -f --set-upstream $remote $source_branch
    [[ $? -ne 0 ]] && fatal "push failed."
fi

if [[ "$source_branch" != "$current_branch" ]]; then
    git checkout $current_branch
    [[ $? -ne 0 ]] && fatal "$current_branch checkout failed."
fi

exit 0
