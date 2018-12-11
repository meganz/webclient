# -*- coding: utf-8 -*-
"""
Configuration file for the `diffcheck.py` tool.

This file should be checked into the repository configuring the
project-specific behaviour. Local (user-specific) modifications can be
made by creating a `local_config.py` file in the same directory as this,
which can contain options overlaying those specified for the proejct
here.
"""

import os

# Checkers to run. Available options for checkers are:
# "jshint", "jscs", "cppcheck", "nsiqcppstyle", "vera++", 'htmlhint'
checkers = ['validator', 'htmlhint', 'jscs', 'jshint']

# Extra options for designated checkers.
# This configuration needs an entry for every encountered checker if the
# `checkers` option above.
extra_options = {
    'jshint': {'norules': False},
    'jscs': {'norules': False},
    'htmlhint': {},
    'validator': {},
    'cppcheck': {},
    'nsiqcppstyle': {},
    'vera++': {}
}

# Paths for the executables to use.
JSHINT_BIN = 'node_modules/.bin/jshint'
JSCS_BIN = 'node_modules/.bin/jscs'
JSCPD_BIN = 'node_modules/.bin/jscpd'
HTMLHINT_BIN = 'node_modules/.bin/htmlhint'
CPPCHECK_BIN = 'cppcheck'
VERAPP_BIN = 'vera++'

NSIQCPPSTYLE_BIN = '/usr/local/nsiqcppstyle/nsiqcppstyle.py'
JSHINT_RULES = '--verbose'
JSCS_RULES = ''
JSCPD_RULES = '--skip-comments -l 13'
HTMLHINT_RULES = '--config ./.htmlhintrc'
VALIDATOR_IGNORE_FILES = ['js/cmsSnapshot.js', 'js/chat/bundle.js', 'nacl-fast.js', 'makecache.js']
VALIDATOR_LINELEN_THRESHOLD = 120 # Max chars per line to trigger.

# Vera++ rules like this should be superseded by a "profile", but it
# doesn't work well, yet, on Vera++ v1.2 :-(
# For rules, look here:
# https://bitbucket.org/verateam/vera/wiki/Rules
VERAPP_RULES = ['F001', 'F002',
                'L001', 'L002', 'L003', 'L004', 'L005',
                'T001', 'T002', 'T003', 'T004', 'T005', 'T006', 'T007',
                'T008', 'T009', 'T010', 'T011', 'T013', 'T017', 'T018',
                'T019']


# Command line configuration.
JSHINT_COMMAND = '{binary} {rules} {files}'
JSCS_COMMAND = '{binary} {rules} {files}'
HTMLHINT_COMMAND = '{binary} {rules} {files}'

CPPCHECK_COMMAND = ("{command}"
                    " --template={{file}};{{line}};{{severity}};{{id}};{{message}}"
                    " --enable=warning,portability,information,missingInclude"
                    " --std=c++03 --force"
                    " --quiet"
                    " -I include"
                    " -I include/mega/{platform}"
                    " src/ examples/")
NSIQCPPSTYLE_COMMAND = ('python {binary} --output=csv --ci -o {outfile}'
                        ' -f contrib/nsiq_filefilter.txt .')
VERAPP_COMMAND = ('vera++ --show-rule --summary'
                  ' {rules}'
                  ' --parameter max-line-length=120 -i -')


# Some attempts to "auto fix" stuff for Win.
if os.name == 'nt':
    JSHINT_BIN = '{}.cmd'.format(JSHINT_BIN).replace('/', '\\')
    JSCS_BIN = '{}.cmd'.format(JSCS_BIN).replace('/', '\\')
    JSCPD_BIN = '{}.cmd'.format(JSCPD_BIN).replace('/', '\\')
    HTMLHINT_BIN = '{}.cmd'.format(HTMLHINT_BIN).replace('/', '\\')
    CPPCHECK_BIN += '.exe'
    VERAPP_BIN += '.exe'
    JSHINT_COMMAND = 'cmd /c {}'.format(JSHINT_COMMAND)
    HTMLHINT_COMMAND = 'cmd /c {}'.format(HTMLHINT_COMMAND)
    JSCS_COMMAND = 'cmd /c {}'.format(JSCS_COMMAND)
    VALIDATOR_IGNORE_FILES = [x.replace('/', '\\') for x in VALIDATOR_IGNORE_FILES]

# Overlay project-config with a potentially available local configuration.
try:
    from local_config import *
except ImportError:
    pass
