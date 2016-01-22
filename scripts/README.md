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

JSHint (for static code analysi) and JSCS (for code style checking)
can be used on the JavaScript code base. Configuration files for both
are part of the project (`.jshintrc`, `.jshintignore` and `.jscsrc`)
to run tests against the existing code base. For that, the right
JavaScript/node.js modules need to be installed. This can easily be
done by running

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
