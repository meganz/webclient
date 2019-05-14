#!/bin/bash
#
# This script is just pulling latest language strings from babel
#
# How to use:
#
# Do not use this script manually. This will automatically run as fabric beta deployment script

# Change to the lang directory
cd $(dirname $BASH_SOURCE)/../lang

# Fetch the latest translations from Babel
wget 'https://babel.mega.co.nz/?u=Jq1EXnelOeQpj7UCaBa1&id=fetch&' -O lang.tar.gz || curl -# 'https://babel.mega.co.nz/?u=Jq1EXnelOeQpj7UCaBa1&id=fetch&' -o lang.tar.gz

# Remove all files in the language directory except the production strings and the downloaded lang.tar.gz file
find . -type f -not -name '*_prod.json' -not -name 'lang.tar.gz' -delete

# Extract the tar.gz file
tar xfvzm lang.tar.gz

# Remove unnecessary files
rm -f strings.json
rm -f error.json
rm -f .ignore

# Final cleanup
rm -f lang.tar.gz