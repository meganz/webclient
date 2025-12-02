#!/bin/bash
#
# This script fetches the latest translation strings from Weblate
# To upload new strings, put the absolute path of the JSON file as the argument

# Change to the scripts directory
cd $(dirname $BASH_SOURCE)

# Using python script (Android/iOS)
if [[ "$@" == *"-a"* || "$@" == *"--application"* ]]; then
  if [ -z "$PYTHON" ]; then
    PYTHON=$(which python3 2> /dev/null)
  fi

  if [ -z "$PYTHON" ]; then
    PYTHON=$(which python 2> /dev/null)
  fi

  if [ -z "$PYTHON" ]; then
    print 'Unable to find Python in $PATH'
    exit 1
  fi

  exec "$PYTHON" python/lang.py "$@"
  exit 0
fi

# Node script (Webclient/PWM extension)
NODE=$(which node 2> /dev/null)
if [ -z "$NODE" ]; then
  print 'Unable to find node.js in $PATH'
  exit 1
fi

exec "$NODE" node/lang.js "$@"
exit 0

