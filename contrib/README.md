Contributions
=============

Static Code and Code Style Checkers
-----------------------------------

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
    contrib/diffcheck.py my-feature develop # Feature branch vs. develop tip.
    contrib/diffcheck.py my-feature         # Feature branch vs. current tip.

This is to ease the enforcement of agreed general style for code
reviews on merge requests as well as enable developers to check their
work against a target branch before issuing a merge request to make
sure things are done correctly. Therefore the number of "round trips"
for the review process can be significantly reduced.

`diffcheck.py` is configured through `contrib/config.py`, which is part of
the repository.  If you want to make local adaptations, please use
`contrib/local_config.py` with local options, which will override those from
`config.py`.  `local_config.py` will not be committed to the repository.
