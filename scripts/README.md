Helper Scripts
==============

Code Builder and Dev Server
---------------------------

To run the webclient, some tools are needed to generate derived
artifacts. For this, two scripts are given.

- `build.sh` -- Static build of the `js/chat/bundle.js`, used for
  example for deployment

- `dev_server.sh` -- Dynamic web server usable during development as a
  simple web server. It will generate the artifacts required in memory
  (no disk writes), and will reload certain resources on change.


Development
-----------

The script `lang.sh` will assist in obtaining the correct translation
strings for the webclient. For further information, see here:

[https://wiki.developers.mega.co.nz/SoftwareEngineering/WebTranslationGuide]

### transifex.py
This is a Python script to import and export translation from Transifex. For further information, see here: https://confluence.developers.mega.co.nz/display/DEV/Webclient

#### Glossary
- __Main resource file:__ the `prod` resource file in Transifex which contains the strings attained from the import of `strings.json` on the latest `develop` branch
- __Branch resource file:__ the `prod-branch_name` resource file in Transifex which contains the strings which are imported from a branch during development
- __Developer comment:__ an attribute in a string object, similar to "Description" in Babel

#### Setting Up
1. Copy `transifex.json.example` and rename it to `transifex.json`
2. Copy your Transifex API token at https://www.transifex.com/user/settings/api/ and set as a system environment variable `TRANSIFEX_TOKEN`

_Notes:_
- Token is also supported in `transifex.json` as TOKEN, but it is more ideal to store it as a system environment variable
- `transifex.json` is git ignored. Please NEVER commit your Transifex API token

#### Workflow
##### Exporting Language Files
1. Run `./scripts/lang.sh`.

_What's happening when running the script?_
1. Pulls all languages from main resource files
2. If the branch has a corresponding resource file, the script also pulls all languages from branch resource file
   1. When completed, the script merges the main resource file and the branch resource file
3. Sanitise the strings from unwanted characters (ex.: < > ...)
4. Create new `strings.json` and `<language>.json` files

##### Importing String(s)
1. Branch-off from develop or master branch
2. Create a JSON file (ex. newString.json) and type your new strings in this following format:
```json
{
    "string_key": {
        "string": "your new string",
        "developer_comment": "description of your string"
    }
    // to do multiple, make multiple of JSON object as above in the same file
}
```
3. Run `./scripts/lang.sh /PATH/TO/FILE/newstring.json`. When completed, it will continue to export all string including the newly imported (merging both main resource file and branch resource file)
4. Add screenshots for the string through Transifex's under Webclient > Context and map the string on the branch resource file

What's happening when running the script?
1. Validate the JSON file content. A valid file content is:
   - No duplicated key in the same JSON file
   - Each string object has a string
   - Each string object has a developer comment
2. If file is valid, then the strings' straight quotes are sanitised to typographical quotes
3. Check if the branch has an existing branch resource file. If not, create a new branch resource file
4. Push the new strings to the branch resource file
5. Pull both main resource file and branch resource file, then merge them
6. Sanitise the strings from unwanted characters (ex.: `< > ...`)
7. Create new `strings.json` and `<language>.json` files

Deployment
----------

A `fabfile.py` is provided, which can be used with the tool Fabric to
automatically deploy the webclient code in different ways to test/beta
servers. See the documentatio nat the head of the `fabfile.py` for
further information.


Check Tools
-----------

### pre_deploy_check.py

This is a simple tool that will conduct some sanity checks (some
unicode character checks, language strings) on certain files within
the repository. See the documentation at the top of the file for
further information.


### diffcheck.py

JSHint (for static code analysi) and JSCS (for code style checking) can be
used on the JavaScript code base.  Configuration files for both are part of
the project (`.jshintrc`, `.jshintignore` and `.jscsrc`) to run tests
against the existing code base.  Furthermore, a tool attempts to catch
minified code from sneaking into the code base.  For that, the right
JavaScript/node.js modules need to be installed.  This can easily be done by
running

    npm install

from the project's root.

Tests can be executed using `make`:

    make jshint  # Runs JSHint on the entire code base.
    make jscs    # Runs JSCS on the entire code base.
    make checks  # Runs JSHint & JSCS on the entire code base.

However, the amount of output can be quite overwhelming. To ease the
pain for this, the `contrib/` directory contains a `diffcheck.py`
tool, which extracts the changed lines in code between two branches or
two commits, and reduces the amount of output produced to only
relevant entries from JSHint and JSCS for the change set.

    contrib/diffcheck.py 97ab5f8e a2f40975  # Between two commits.
    contrib/diffcheck.py 97ab5f8e           # Against current branch tip.
    contrib/diffcheck.py develop my-feature # From develop tip to feature tip.
    contrib/diffcheck.py develop            # From develop to current tip.

This is to ease the enforcement of agreed general style for code
reviews on merge requests as well as enable developers to check their
work against a target branch before issuing a merge request to make
sure things are done correctly. Therefore the number of "round trips"
for the review process can be significantly reduced.

`diffcheck.py` is configured through `contrib/config.py`, which is
part of the repository.  If you want to make local adaptations, please
use `contrib/local_config.py` with local options, which will override
those from `config.py`.  `local_config.py` will not be committed to
the repository.


### translation.php

No real idea what this script does ... :-(

Some helper script to do translations on HTML.
