#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Selenium test runner for Transfers Popup.

You need a mega.nz account to run the test.
Run this script with the --help flag for command line parameters details.

./selenium_tpp.py -u <user_name> -p <PASSWORD> [-b <server url>]`

Requirements:
    - Selenium Python Webdriver: `pip install -U selenium`
    - WebDriver for Chrome: https://sites.google.com/a/chromium.org/chromedriver/home make sure it's added to PATH
    - GeckoDriver for Firefox: https://github.com/mozilla/geckodriver/releases make sure it's added to PATH
    - Pillow for visual diffs: `pip install pillow`

This test runner will work with both Python 2.7 as well as 3.x.
"""

# Test suite includes:
#
#    RunLevel  TestCase
#    --------  ------------------------
#        0001
#        0002

import sys
import unittest
import argparse
import tempfile

import common_tests

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

VDIFFS = False # -v command line argument
USERNAME = None # -u command line argument
PASSWORD = None # -p command line argument
BASE_URL = "https://smoketest.static.mega.co.nz" # -b command line argument

class MegaTppTest(unittest.TestCase):
    """Class docstring"""
    def setUp(self):
        chrome_options = Options()
        chrome_options.add_argument("--lang=en")
        chrome_options.add_argument("--window-size=1270,812")
        chrome_options.add_argument(
            '--user-agent=Mozilla/5.0 (Selenium; %s) Chrome/256.3.14' % webdriver.__version__)
        chrome_options.add_experimental_option(
            "prefs",
            {
                'download.prompt_for_download': 'false',
                'download.default_directory': tempfile.gettempdir()
            })

        self.driver = webdriver.Chrome(chrome_options=chrome_options)
        self.baseurl = BASE_URL
        self.username = USERNAME
        self.password = PASSWORD

    def test_suite(self):
        """Execute selenium tests"""
        testname = 'TPP enable/disable WIP'

        driver = self.driver
        driver.get(self.baseurl + "/")

        print testname + ' start'

        test = common_tests.CommonTests(self.driver, self.username, self.password, self.baseurl)
        test.login_popup()

        print testname + ' finished'
# Finished class MegaTppTest

if __name__ == "__main__":
    # Setup the command line argument PARSER.
    DESCRIPTION = 'Selenium test suite for mega.nz'
    EPILOG = ('Note: You need the WebDriver for Chrome: '
              'https://sites.google.com/a/chromium.org/chromedriver/home')

    PARSER = argparse.ArgumentParser(description=DESCRIPTION, epilog=EPILOG)
    PARSER.add_argument('-u', '--username', required=True,
                        help='The username to log in as.')
    PARSER.add_argument('-p', '--password', required=True,
                        help='The password for the given username.')
    PARSER.add_argument('-b', '--baseurl', default=None,
                        help='The base url to perform the tests over.')
    PARSER.add_argument('-v', '--vdiffs', action='store_true',
                        help='Perform visual diff tests.')
    ARGS, LEFTOVERS = PARSER.parse_known_args()

    USERNAME = ARGS.username
    del sys.argv[1:3]
    PASSWORD = ARGS.password
    del sys.argv[1:3]
    if ARGS.baseurl is not None:
        BASE_URL = ARGS.baseurl
        del sys.argv[1:3]
    if ARGS.vdiffs:
        VDIFFS = True
        del sys.argv[1:3]

    unittest.main()
# Finished __main___
