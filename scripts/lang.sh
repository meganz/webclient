#!/bin/bash
#
# This script fetches the latest translation strings from Transifex
# To upload new strings, put the absolute path of the JSON file as the argument

if [ -z "$PYTHON" ]; then
  PYTHON=$(which python3 2> /dev/null)
fi

if [ -z "$PYTHON" ]; then
  PYTHON=$(which python 2> /dev/null)
fi

if [ -z "$PYTHON" ]; then
  PYTHON=$(which python2 2> /dev/null)
fi

if [ -z "$PYTHON" ]; then
  print 'Unable to find Python in $PATH'
  exit 1
fi

# Change to the scripts directory
cd $(dirname $BASH_SOURCE)

# Run Transifex export
exec "$PYTHON" transifex.py "$@"
