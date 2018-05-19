#!/bin/bash -x
#
# This script fetches the latest translation strings from Babel for the live site. This means it only fetches language
# strings that are currently in use in the develop branch. It updates all the xx_prod.json files in the /lang
# directory. Then it pushes the changes to develop branch.
#
# This script is not for general use, it is used by the production build script only.


# Change to the scripts directory
cd $(dirname $BASH_SOURCE)/../scripts

# Find used strings
data=$(php -f translation.php);

# Change to the lang directory
cd ../lang

# Fetch the latest translations from Babel
wget --post-data='u=Jq1EXnelOeQpj7UCaBa1&id=fetch&s=6&ids='$data https://babel.mega.co.nz -O lang.tar.gz

# Check if the fetch failed
if [ $? -ne 0 ]; then

    echo "ERROR: There was a problem fetching production language strings from Babel. The update was aborted."
    exit 1
fi

# Remove any old errors
rm error.json

# Extract the tar.gz file
tar xfvz lang.tar.gz

# Display any errors from Babel e.g. missing strings to the console
cat error.json

# If the error.json file does not exist, then this command will fail which is fine, so continue as normal
if [ $? -ne 0 ]; then

    echo "No errors from Babel, continuing as normal..."

    # Delete the tar.gz file and other non-needed files
    rm lang.tar.gz
    rm strings.json
    rm strings_prod.json
    rm error.json
    rm .ignore

    # Add the .json files
    git add *.json

    # Commit it
    git commit -m 'Updated production language strings from Babel'

    # Push to develop branch
    git push
else
    # Otherwise show an error and make sure they fix the issues before continuing with the release
    echo
    echo "ERROR: There are errors above with the production language strings from Babel."
    echo "The issues must be resolved before proceeding with the release."

    # Delete the tar.gz file and other non-needed files
    rm lang.tar.gz
    rm strings.json
    rm strings_prod.json
    rm error.json
    rm .ignore

    exit 1
fi
