#!/bin/bash -x

# Change to the script directory
cd $(dirname $BASH_SOURCE)/../scripts

# Find used strings
data=$(php -f translation.php);

# Change to the lang directory
cd ../lang

# Fetch the latest translations from Babel
wget --post-data='u=Jq1EXnelOeQpj7UCaBa1&id=fetch&s=6&ids='$data https://babel.mega.co.nz -O lang.tar.gz

# Extract the tar.gz file
tar xfvz lang.tar.gz

# Delete it
rm lang.tar.gz
