#!/bin/bash
#
# A helper script to run the diffcheck script just like the Jenkins runs it at merge request time.
#
# How to use:
# ./scripts/local-diffcheck.sh             (Run this script from the webclient directory)

scripts/diffcheck.py --jscpd origin/develop
