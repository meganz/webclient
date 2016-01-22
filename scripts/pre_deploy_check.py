#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Checker to identify some problems pre deployment.

* Checks for non-ASCII characters (code >= 128).
* Checks for unknown translation strings in HTML files.
"""

import os
import sys
import re
import logging
import codecs
import json
import glob

FILE_TYPES = ['js', 'jsx', 'json', 'html', 'css']
CHECK_DIRS = ['js', 'html', 'css', 'lang']
IGNORE_FILES = ['secureboot.js', 'rsaasm.js']

def get_entries(path, result_files):
    """
    Returns a list of matching file entries and directories for the given
    path.

    :param path: File path to search in.
    :param result_files: List to collect all result file paths in.
    :return: A lists containing sub-directories.
    """
    logging.debug('Collecting entries from directory {}'.format(path))
    entries = os.listdir(path)
    sub_dirs = []
    for item in entries:
        item_path = os.path.join(path, item)
        if os.path.isfile(item_path):
            if item.split('.')[-1] in FILE_TYPES and item not in IGNORE_FILES:
                result_files.append(item_path)
        elif os.path.isdir(item_path):
            if path == '.' and item not in CHECK_DIRS:
                continue
            sub_dirs.append(item_path)

    return sub_dirs


def traverse_directories(dirs, result_files):
    """
    Traverses a directory tree to find all fine entries relevant for
    checking.
    
    :param  dirs: List of directories to search in.
    :param result_files: List to collect all result file paths in.
    """
    for item in dirs:
        sub_dirs = get_entries(item, result_files)
        traverse_directories(sub_dirs, result_files)
    

def analyse_files_for_special_chars(filename):
    """
    Analyses a file for characters with unicode code >= 128.

    :param filename: Name/path of file to analyse.
    :return: True, if wide characters are found. False otherwise.
    """
    test_fail = False
    try:
        with codecs.open(filename, encoding='ascii') as fd:
            fd.read()
    except UnicodeDecodeError:
        # We've got a special character we don't like.
        with codecs.open(filename, encoding='utf8') as fd:
            lines = fd.readlines()
            for linenumber, line in enumerate(lines):
                for column, character in enumerate(line):
                    code = ord(character)
                    if code >= 128:
                        logging.warn(u'File {}, line {}, column {}:'
                                     ' special character {} ({})'
                                     .format(filename, linenumber,
                                             column, character, code))
                        test_fail = True

    return test_fail
                        

def check_translation_strings():
    """
    Checks for the presence of all translation strings in all HTML files.

    :return: True, if language strings cannot be found. False otherwise.
    """
    test_fail = False

    # Get language strings and add copyright year placeholder.
    lang_strings = json.load(open('lang/en.json'))
    lang_strings['0'] = ''

    # Check all HTML files.
    lang_placeholder = re.compile(r'\[\$([0-9]+)\]', re.MULTILINE)
    html_files = glob.glob('html/*.html')
    for html_file in html_files:
        content = open(html_file).read()
        placeholders = lang_placeholder.findall(content)
        for item in placeholders:
            if item not in lang_strings:
                logging.warn('Cannot find string ID {} in {}'.
                             format(item, html_file))
                test_fail = True

    return test_fail


def main():
    # Get files to check for special characters we don't like.
    result_files = []
    traverse_directories(['.'], result_files)
    
    # Analyse for the special characters.
    test_fail = False
    for item in result_files:
        test_fail |= analyse_files_for_special_chars(item)


    # Analyse translation strings.
    test_fail |= check_translation_strings()

    # Exit code 1 for any failures.
    if test_fail:
        sys.exit(1)

    
if __name__ == '__main__':
    # Set up logging.
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)s\t%(asctime)s %(message)s')

    main()
