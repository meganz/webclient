#!/bin/bash
#
# This script is just pulling latest language strings from babel
#
# How to use:
#
# From inside your local webclient directory, run:
# ./scripts/lang.sh

# Change to the lang directory
cd $(dirname $BASH_SOURCE)/../lang

if [ $? -ne 0 ]; then

    echo "ERROR: Cannot able to get into language folder. The update was aborted."
    exit 1
fi

# Fetch the latest translations from Babel
wget 'https://babel.mega.co.nz/?u=Jq1EXnelOeQpj7UCaBa1&id=fetch&' -O lang.tar.gz || curl -# 'https://babel.mega.co.nz/?u=Jq1EXnelOeQpj7UCaBa1&id=fetch&' -o lang.tar.gz

if [ $? -ne 0 ]; then

    echo "ERROR: There was a problem fetching beta language strings from Babel. The update was aborted."
    exit 1
fi

# Remove all files in the language directory except the production strings and the downloaded lang.tar.gz file
find . -type f -not -name '*_prod.json' -not -name 'lang.tar.gz' -delete

# Extract the tar.gz file
tar xfvzm lang.tar.gz

# Display any errors from Babel e.g. missing strings to the console
cat error.json

# If the error.json file does not exist, then this command will fail which is fine, so continue as normal
if [ $? -ne 0 ]; then

    echo "No errors from Babel, continuing as normal..."
else
    echo
    echo "ERROR: There are errors above with the language strings from Babel."
    exit 1
fi

# Remove unnecessary files
rm -f strings.json
rm -f error.json
rm -f .ignore

# Final cleanup
rm -f lang.tar.gz

echo
echo "Language files successfully downloaded and extracted."