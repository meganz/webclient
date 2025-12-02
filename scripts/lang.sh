#!/bin/bash

# Change to the scripts directory
cd $(dirname $BASH_SOURCE)

# Patch to subtree script
exec weblate/lang.sh "$@"
