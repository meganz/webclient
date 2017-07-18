#!/bin/bash -x
rm *.json
rm lang.tar.gz

# Fetch the latest translations from Babel
data=$(php -f ./translation.php);
wget --post-data='u=Jq1EXnelOeQpj7UCaBa1&id=fetch&s=6&ids='$data https://babel.mega.co.nz -O lang.tar.gz

# Extract the tar.gz file
tar xfvz lang.tar.gz

# Delete it
rm lang.tar.gz
mv *.json ../lang/