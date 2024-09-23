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

HASHING_FILE_TYPES = ['js', 'jsx', 'html', 'css']
HASHING_CHECK_DIRS = ['js', 'html', 'css', 'lang']
HASHING_IGNORE_FILES = ['secureboot.js', 'rsaasm.js', 'pdf.worker.js']

def _get_entries(path, result_files, file_types, ignore_files,
                 check_dirs=None):
    """
    Returns a list of matching file entries and directories as specified.

    :param path: File path to search in.
    :param result_files: List to collect all result file paths in.
    :param file_types: List of file types to check for.
    :param ignore_files: List of files to ignore.
    :param check_dirs: List of directories to check. If empty, all directories
        will be checked.
    :return: A lists containing sub-directories.
    """
    entries = os.listdir(path)
    sub_dirs = []
    for item in entries:
        item_path = os.path.normpath(os.path.join(path, item))
        if os.path.isfile(item_path):
            if item.split('.')[-1] in file_types and item_path not in ignore_files:
                result_files.append(item_path)
        elif os.path.isdir(item_path):
            if path == '.' and check_dirs and item not in check_dirs:
                continue
            sub_dirs.append(item_path)

    return sub_dirs


## Check for special characters.

def _get_hashable_entries(path, result_files):
    """
    Returns a list of matching file entries and directories that may require
    hashing for `secureboot.js`.

    :param path: File path to search in.
    :param result_files: List to collect all result file paths in.
    :return: A lists containing sub-directories.
    """
    logging.debug('Collecting hashable entries from directory {}'
                  .format(path))
    return _get_entries(path, result_files, HASHING_FILE_TYPES,
                        HASHING_IGNORE_FILES, HASHING_CHECK_DIRS)


def traverse_directories(dirs, result_files, entries_function):
    """
    Traverses a directory tree to find all fine entries relevant for
    checking compliance for hashing (for `secureboot.js`)

    :param  dirs: List of directories to search in.
    :param result_files: List to collect all result file paths in.
    :param entries_function: Function to collect entries from a path.
    """
    for item in dirs:
        sub_dirs = entries_function(item, result_files)
        traverse_directories(sub_dirs, result_files, entries_function)


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
                        logging.warning(u'File {}, line {}, column {}:'
                                     ' special character {} ({})'
                                     .format(filename, linenumber,
                                             column, character, code))
                        test_fail = True

    return test_fail


## Check for translation strings.

def check_translation_strings():
    """
    Checks for the presence of all translation strings in all HTML files.

    :return: True, if language strings cannot be found. False otherwise.
    """
    test_fail = False

    # Get language strings and add copyright year placeholder.
    try:
        lang_strings = json.load(open('lang/en.json'))
    except:
        logging.warning('lang/en.json file not found, run scripts/lang.sh')
        return test_fail
    lang_strings['0'] = ''

    # Check all HTML files.
    lang_placeholder = re.compile(r'\[\$(\w+)]', re.MULTILINE)
    html_files = glob.glob('html/*.html')
    for html_file in html_files:
        content = open(html_file).read()
        placeholders = lang_placeholder.findall(content)
        for item in placeholders:
            if item not in lang_strings:
                logging.warning('Cannot find string ID {} in {}'.
                             format(item, html_file))
                test_fail = True

    return test_fail


## Main matters ...

def main():
    # Will be set to `True` if any test fails.
    test_fail = False

    # Get files to check for special characters we don't like.
    logging.info('Checking for non-ASCII characters ...')
    result_files = []
    traverse_directories(['.'], result_files, _get_hashable_entries)

    # Analyse for the special characters.
    for item in result_files:
        test_fail |= analyse_files_for_special_chars(item)


    # Analyse translation strings.
    logging.info('Analysing translation strings ...')
    test_fail |= check_translation_strings()


    # Exit code 1 for any failures.
    if test_fail:
        sys.exit(1)


if __name__ == '__main__':
    # Set up logging.
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)s\t%(asctime)s %(message)s')

    main()
