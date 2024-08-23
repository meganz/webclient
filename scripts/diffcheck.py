#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test runner that will limit the output of tests to a result set relevant for a
particular diff in Git. That is a diff between revisions or a diff between two
branches' tips.

This test runner will work with both Python 2.7 as well as 3.x.
"""

## Created: 23 May 2015 Guy Kloss <gk@mega.nz>
##
## (c) 2015-2016 by Mega Limited, Auckland, New Zealand
##     http://mega.nz/
##     Simplified (2-clause) BSD License.
##
## You should have received a copy of the license along with this
## program.
##
## This file is part of the multi-party chat encryption suite.
##
## This code is distributed in the hope that it will be useful,
## but WITHOUT ANY WARRANTY; without even the implied warranty of
## MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

__author__ = 'Guy Kloss <gk@mega.nz>'

import argparse
import os
import sys
import re
import codecs
import logging
import tempfile
import subprocess
import collections
import config
from subprocess import CalledProcessError

PLATFORMS = {'posix': 'posix',
             'nt': 'win32'}
PROJECT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                            os.path.pardir))
PATH_SPLITTER = re.compile(r'\\|/')

BASE_BRANCH = None
CURRENT_BRANCH = None

def run_git_command(command, decode=None):
    """
    Executes a git command and returns the output from it.
    """
    try:
        output = subprocess.check_output('git {}'.format(command).split())
    except OSError as ex:
        if ex.errno == 2:
            logging.error('Git not installed. Install it first.')
        else:
            logging.error('Error calling Git: {}'.format(ex))
        sys.exit(1)

    if decode is not None:
        output = output.decode(decode).rstrip().split('\n')

    return output

def get_git_line_sets(base, target):
    """
    Obtains the Git diff between the base and target to identify the lines that
    contain alterations in the target code. If branch names are given for the
    base or target, the tips of those branches are used.

    :param base: Base branch/commit for the diff.
    :param target: Target branch/commit for the diff.
    :return: A dictionary of changed line numbers. The key in the dictionary is
        the file path, the value is a set of line numbers.
    """
    # Get the Git output for the desired diff.
    logging.info('Extracting relevant lines from Git diff ...')
    diff = run_git_command('diff -U0 {} {}'.format(base, target), 'latin1')

    # Hunt down lines of changes for different files.
    file_line_mapping = collections.defaultdict(set)
    current_file = None
    for line in diff:
        if line.startswith('+++ '):
            # Line giving target file.
            for_file = line.split()[1]
            current_file = tuple(re.split(PATH_SPLITTER, for_file[2:]))
        elif line.startswith('@@ '):
            # Line giving alteration line range of diff fragment.
            target_lines = line.split()[2].split(',')
            start_line = int(target_lines[0])
            line_range = int(target_lines[1]) if len(target_lines) == 2 else 1
            # Update our lines if we have target lines.
            if line_range > 0:
                file_line_mapping[current_file].update(range(start_line,
                                                             start_line
                                                             + line_range))

    return file_line_mapping

def get_current_branch():
    global CURRENT_BRANCH

    if CURRENT_BRANCH is None:
        CURRENT_BRANCH = run_git_command('symbolic-ref --short -q HEAD').decode('utf8').rstrip()

    return CURRENT_BRANCH

def get_commits_in_branch(current_branch=None):
    protected_branches = ['master', 'develop', 'webclient-v2', 'webclient-v3']

    if current_branch is None:
        current_branch = get_current_branch()

    if current_branch in protected_branches:
        logging.warning(f'In protected branch ({current_branch})')
        return -1, 0

    commits = int(run_git_command('rev-list --no-merges --count {}..{}'.format(BASE_BRANCH, current_branch)).decode('utf8'))
    # logging.info('{} commits in branch {}'.format(commits, current_branch))

    authors = len(run_git_command('shortlog -s --no-merges {}..{}'.format(BASE_BRANCH, current_branch), 'utf8'))
    # logging.info('{} authors worked in branch {}'.format(authors, current_branch))

    return commits, authors

def pick_files_to_test(file_line_mapping, extensions=None, exclude=None):
    if extensions is None:
        extensions = ['js', 'jsx']

    files_to_test = [os.path.join(*x)
                     for x in file_line_mapping.keys()
                     if x[-1].split('.')[-1] in extensions]

    if exclude is not None:
        files_to_test = [x for x in files_to_test if not exclude.match(x)]

    # logging.info(files_to_test)
    return files_to_test

file_cache = {}
def read_file(file_path):
    if file_path not in file_cache:
        with open(file_path) as file:
            file_cache[file_path] = file.read().split('\n')
    return file_cache[file_path]

def reduce_eslint(file_line_mapping, **extra):
    """
    Runs ESLint on the project with the default configured rules. The output
    is reduced to only contain entries from the Git change set.

    :param file_line_mapping: Mapping of files with changed lines (obtained
        `get_git_line_sets()`).
    :param extra: Optional keyword arguments:
        `norules`: If true, omit verbose output of violated rule identifier
                   (default: `False` to include rules).
    :return: A tuple containing the formatted string suitable for output and
        an integer containing the number of failed rules.
    """
    norules = extra['norules'] if 'norules' in extra else False
    # Get the ESLint output.
    os.chdir(PROJECT_PATH)
    rules = config.ESLINT_RULES if not norules else ''
    files_to_test = pick_files_to_test(file_line_mapping)

    if len(files_to_test) == 0:
        logging.info('ESLint: No modified JavaScript files found.')
        return '', 0

    logging.info('Obtaining ESLint output ...')
    command = config.ESLINT_COMMAND.format(binary=config.ESLINT_BIN,
                                           rules=rules,
                                           files=' '.join(files_to_test))
    warnings = 0
    output = None
    try:
        output = subprocess.check_output(command.split(), stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as ex:
        # ESlint found something, so it has returned an error code.
        # But we still want the output in the same fashion.
        output = ex.output
    except OSError as ex:
        if ex.errno == 2:
            logging.error('ESLint not installed.'
                          ' Try to do so with `npm install`.')
        else:
            logging.error('Error calling ESLint: {}'.format(ex))
        return '*** ESLint: {} ***'.format(ex), 0
    output = output.decode('utf8').replace(PROJECT_PATH + os.path.sep, '').split('\n')

    if len(output) > 1 and output[1] == u'Oops! Something went wrong! :(':
        return '\n'.join(output), 1

    # Go through output and collect only relevant lines to the result.
    result = ['\nESLint output:\n==============\n']
    eslint_expression = re.compile(r'(.+): line (\d+), col \d+, .+')
    warning_result = []
    for line in output:
        parse_result = eslint_expression.findall(line)
        # Check if we've got a relevant line.
        if parse_result:
            file_name, line_no = parse_result[0][0], int(parse_result[0][1])
            file_name = tuple(re.split(PATH_SPLITTER, file_name))
            # Check if the line is part of our selection list.
            if line_no in file_line_mapping[file_name]:
                if re.search(r': line \d+, col \d+, Warning - ', line):
                    warnings += 1
                    warning_result.append(line)
                else:
                    result.append(line)

    result = result + warning_result;

    # Add the number of errors and return in a nicely formatted way.
    error_count = len(result) - 1
    if error_count == 0:
        return '', 0
    if warnings:
        result.append('\n{} issue(s) found, {} Errors and {} Warnings'.format(error_count, error_count - warnings, warnings))
    else:
        result.append('\n{} error(s) found.'.format(error_count))
    return '\n'.join(result), error_count - warnings


def reduce_stylelint(file_line_mapping, **extra):
    """
    Runs StyleLint on the project with the default configured rules. The output
    is reduced to only contain entries from the Git change set.

    :param file_line_mapping: Mapping of files with changed lines (obtained
        `get_git_line_sets()`).
    :param extra: Optional keyword arguments:
        `norules`: If true, omit verbose output of violated rule identifier
                   (default: `False` to include rules).
    :return: A tuple containing the formatted string suitable for output and
        an integer containing the number of failed rules.
    """
    norules = extra['norules'] if 'norules' in extra else False
    # Get the StyleLint output.
    os.chdir(PROJECT_PATH)
    rules = config.STYLELINT_RULES if not norules else ''
    files_to_test = pick_files_to_test(file_line_mapping, ['css'])

    if len(files_to_test) == 0:
        logging.info('StyleLint: No modified CSS files found.')
        return '', 0

    if os.name == 'nt':
        files_to_test = [x.replace('\\', '/') for x in files_to_test]

    logging.info('Obtaining StyleLint output ...')
    command = config.STYLELINT_COMMAND.format(binary=config.STYLELINT_BIN,
                                           rules=rules,
                                           files=' '.join(files_to_test))
    warnings = 0
    output = None
    try:
        output = subprocess.check_output(command.split(), stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as ex:
        # StyleLint found something, so it has returned an error code.
        # But we still want the output in the same fashion.
        output = ex.output
        # unless no output given, e.g. stderr used for something unexpected.
        if not output and ex.returncode == 1:
            return '*** StyleLint: {} ***'.format(ex), 0
    except OSError as ex:
        if ex.errno == 2:
            logging.error('StyleLint not installed.'
                          ' Try to do so with `npm install`.')
        else:
            logging.error('Error calling StyleLint: {}'.format(ex))
        return '*** StyleLint: {} ***'.format(ex), 0
    output = output.decode('utf8').replace(PROJECT_PATH + os.path.sep, '').split('\n')

    # Go through output and collect only relevant lines to the result.
    result = ['\nStyleLint output:\n=================\n']
    cmdout_expression = re.compile(r'(.+): line (\d+), col \d+, .+')
    warning_result = []
    warning_rules = r'"(?:css-logical-props|css-overflow)"'

    def is_warn_content(filename, lineno, error):
        if error.find('"css-overflow"') > 0:
            return 0 if read_file(filename)[lineno - 1].find('clip') > 0 else 2

        return 1

    for line in output:
        parse_result = cmdout_expression.findall(line)
        # Check if we've got a relevant line.
        if parse_result:
            file_name, line_no = parse_result[0][0], int(parse_result[0][1])
            file_name_t = tuple(re.split(PATH_SPLITTER, file_name))
            # Check if the line is part of our selection list, or if a css syntax
            # error happened within a file since that will halt further parsing
            if line_no in file_line_mapping[file_name_t] or re.search(r'CssSyntaxError', line):
                do_warn = False

                if re.search(r': line \d+, col \d+, warning - ', line):
                    do_warn = True
                else:
                    # plugin/no-unsupported-browser-features is too verbose
                    # with e.g. Chrome 58,59,60,61,62,63,64,65,66,67,68,69
                    if re.search(r'Unexpected browser feature', line):
                        line = re.sub(r'(\w+ [\d.]+)(,[\d.-]+)+,([\d.]+)', r'\1-\3', line)
                        if re.search(warning_rules, line):
                            wt = is_warn_content(file_name, line_no, line)
                            if wt > 1:
                                continue
                            if wt > 0:
                                do_warn = True
                                line = re.sub(', error -', ', warning -', line)

                if do_warn:
                    warnings += 1
                    warning_result.append(line)
                else:
                    result.append(line)

    result = result + warning_result

    # Add the number of errors and return in a nicely formatted way.
    error_count = len(result) - 1
    if error_count == 0:
        return '', 0
    if warnings:
        result.append('\n{} issue(s) found, {} Errors and {} Warnings'.format(error_count, error_count - warnings, warnings))
    else:
        result.append('\n{} error(s) found.'.format(error_count))
    return '\n'.join(result), error_count - warnings

def strip_ansi_codes(s):
    return re.sub(r'\x1b\[([0-9,A-Z]{1,2}(;[0-9]{1,2})?(;[0-9]{3})?)?[m|K]?', '', s)

def reduce_htmlhint(file_line_mapping, **extra):
    """
    Runs HTMLHint on the project for changed files. The output
    is reduced to only contain entries from the Git change set.

    :param file_line_mapping: Mapping of files with changed lines (obtained
        `get_git_line_sets()`).
    :param extra: Optional keyword arguments:
        `norules`: If true, omit verbose output of violated rule identifier
                   (default: `False` to include rules).
    :return: A tuple containing the formatted string suitable for output and
        an integer containing the number of failed rules.
    """
    norules = extra['norules'] if 'norules' in extra else False
    # Get the HTMLHint output.
    os.chdir(PROJECT_PATH)
    rules = config.HTMLHINT_RULES if not norules else ''
    files_to_test = pick_files_to_test(file_line_mapping, ['htm', 'html'], re.compile(r'dont-deploy|html[\\/]pdf'))

    if len(files_to_test) == 0:
        logging.info('HTMLHint: No modified HTML files found.')
        return '', 0

    logging.info('Obtaining HTMLHint output ...')
    command = config.HTMLHINT_COMMAND.format(binary=config.HTMLHINT_BIN,
                                         rules=rules,
                                         files=' '.join(files_to_test))
    output = None
    try:
        output = subprocess.check_output(command.split())
    except subprocess.CalledProcessError as ex:
        # HTMLHint found something, so it has returned an error code.
        # But we still want the output in the same fashion.
        output = ex.output
    except OSError as ex:
        if ex.errno == 2:
            logging.error('HTMLHint not installed.'
                          ' Try to do so with `npm install`.')
        else:
            logging.error('Error calling HTMLHint: {}'.format(ex))
        return '*** HTMLHint: {} ***'.format(ex), 0
    output = strip_ansi_codes(output.decode('utf8')).rstrip().split('\n')

    if re.search(r'Scanned \d+ files, no errors found', output[-1]):
        return '', 0

    # Go through output and collect only relevant lines to the result.
    result = ['\nHTMLHint output:\n================']

    for line in output:
        if line.find('Config loaded:') != -1 or line.find('linearGradient') > 0:
            continue
        result.append(line)

    # Add the number of errors and return in a nicely formatted way.
    return re.sub('\n+', '\n', '\n\n'.join(result).rstrip()), len(result) > 6

def copypaste_detector(file_line_mapping):
    report = []
    output = None
    cwd = os.getcwd()

    try:
        output = subprocess.check_output('{} {} ./html/js ./js'.format(config.JSCPD_BIN, config.JSCPD_RULES).split())
    except OSError as ex:
        logging.error('Error calling JSCPD: {}'.format(ex))
        return False
    output = strip_ansi_codes(output.decode('utf8')).rstrip().split('\n')
    output = [re.sub(r'^[ -]+ [\\/]?', '', f.replace(cwd, '')).strip() for f in output if re.search(r'^ ', f)]

    # Build a list of duplicated blocks per file
    idx = 0
    dupes = collections.defaultdict(set)
    for file in output:
        x,filename,ln1,ln2,z = re.split(r'^(.*) \[(\d+):\d+ - (\d+):\d+\]$', file)
        dupes[filename].update(range(int(ln1), int(ln2) + 1))

    # Check whether changed lines includes copy/paste code
    for filename, line_set in file_line_mapping.items():
        file_path = os.path.join(*filename)

        if file_path in dupes:
            rng = dupes[file_path]
            its = list(rng.intersection(line_set))
            if len(its):
                report.append('copy/paste detector found a duplicated block of code at {} around lines {}-{}'
                                .format(file_path, its[0], its[-1]))

    if len(report):
        print('\n' + '\n'.join(report))
        return True

    return False

def analyse_secureboot(filename, result):
    """
    Analyses secureboot.js

    :param filename: Name/path of file to analyse.
    :return: True, if errors are found. False otherwise.
    """
    test_fail = False

    with open(filename, 'r', encoding="utf-8") as f:
        contents = f.read()

    match = re.search(r'(?:\{\sf:|\{f:\s|\{f\s:|\{\sf\s:)(?!lang)', contents)
    if match:
        start = max(match.start() - 12, 0)
        end = min(len(contents), match.end() + 24)
        result.append('Found invalid jsl.push-like reference in secureboot.js -> {}...'.format(contents[start:end].strip()))
        test_fail = True

    return test_fail


def analyse_files_for_special_chars(filename, result):
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
                        result.append(u'Found non-ASCII character {} ({}) at file {}, line {}, column {}'
                                     .format(code, character, filename, linenumber + 1, column))
                        test_fail = True

    return test_fail

def inspectcss(file, ln, line, result):
    fatal = 0
    line = line.strip()
    indent = ' ' * (len(file)+len(str(ln))+3)

    # check potentially invalid url()s
    match = re.search(r'url\([^)]+images/mega/', line)
    if match and not re.search(r'url\([\'"]?(\.\./)+images/mega/', line):
        fatal += 1
        result.append('{}:{}: {}\n{}^ Potentially invalid url()'
            .format(file, ln, line, indent))

    return fatal

def inspecthtml(file, ln, line, result):
    fatal = 0
    line = line.strip()
    indent = ' ' * (len(file)+len(str(ln))+3)

    # check for hidden-less fm-dialogs
    match = re.search(r'mega-dialog[\s"\']', line)
    if match and not re.search(r'hidden[\'"\s]', line):
        fatal += 1
        result.append('{}:{}: {}\n{}^ Missing hidden class on mega-dialog.'.format(file, ln, line, indent))
    if match and not re.search(r'=["\']mega-dialog', line):
        msg = '{}:{}: {}\n{}^ for consistency, mega-dialog shall be placed as the first class.'
        result.append(msg.format(file, ln, line, indent))

    # check for relative URLs without 'clickurl' class
    match = re.search(r'href\s*=\s*["\']?/', line)
    if match and not re.search('clickurl', line):
        fatal += 1
        result.append('{}:{}: {}\n{}^ Missing clickurl class.'.format(file, ln, line, indent))

    return fatal

def validate_strings(key_value_pairs):
    strings = OrderedDict()
    duplicated_keys = []
    for key, value in key_value_pairs:
        if key in strings:
           duplicated_keys.append(key)
        else:
           strings[key] = value
    if len(duplicated_keys) > 0:
        return (True, duplicated_keys)
    return (False, strings)

def natural_sort(a,b):
    if a.isnumeric() and b.isnumeric():
        a = int(a)
        b = int(b)
    if a > b:
        return 1
    elif a < b:
        return -1
    else:
        return 0

def reduce_validator(file_line_mapping, **extra):
    """
    Checks changed files for contents and alalyzes them.

    :param file_line_mapping: Mapping of files with changed lines (obtained
        `get_git_line_sets()`).
    :param extra: Optional keyword arguments (none available).
    :return: A tuple containing the formatted string suitable for output and
        an integer containing the number of failed rules.
    """

    exclude = ['vendor', 'asm', 'sjcl', 'dont-deploy', 'secureboot', 'test']
    special_chars_exclude = ['secureboot', 'test', 'emoji', 'dont-deploy', 'pdf.worker', 'images' + os.path.sep]
    logging.info('Analyzing modified files ...')
    result = ['\nValidator output:\n=================']
    warning = 'This is a security product. Do not add unverifiable code to the repository!'
    fatal = 0

    # Analise changed lines per modified file
    for filename, line_set in file_line_mapping.items():
        file_path = os.path.join(*filename)
        file_extension = os.path.splitext(file_path)[-1]

        if not any([n in file_path for n in special_chars_exclude]) and file_extension not in ['.py', '.sh']:
            if analyse_files_for_special_chars(file_path, result):
                fatal += 1
                # break

        # Ignore known custom made files
        if file_path in config.VALIDATOR_IGNORE_FILES:
            continue
        if any([n in file_path for n in exclude]):
            if 'secureboot' in file_path and analyse_secureboot(file_path, result):
                fatal += 1
            continue

        # Ignore this specific file types
        if file_extension in ['.json','.py','.sh', '.svg']:
            continue

        # If .min.js is in the filename (most basic detection), then log it and move onto the next file
        if '.min.js' in file_path:
            fatal += 1
            result.append('Minified/obfuscated code found in file {}. {}'
                          .format(file_path, warning))
            # continue

        if os.path.getsize(file_path) > 190000 and not file_extension in ['.css', '.html']:
            result.append('The file "{}" has turned too big, '
                          'any new functions must be moved elsewhere.'.format(file_path))
            # continue

        worker_upd = False if file_path.find('nodedec.js') >= 0 else None

        with open(file_path, 'r') as fd:
            # Check line lengths in file.
            line_number = 0
            for line in fd.readlines():
                line_number += 1
                if line_number not in line_set:
                    # Not a changed line.
                    continue

                # Analyse worker files.
                if worker_upd is False and line.find('WORKER_VERSION =') > 0:
                    worker_upd = True

                # Analyse CSS files...
                if file_extension == '.css':
                    fatal += inspectcss(file_path, line_number, line, result)
                    continue

                # Analyse HTML files...
                if file_extension == '.html':
                    fatal += inspecthtml(file_path, line_number, line, result)
                    continue

        if worker_upd is False:
            fatal += 1
            result.append('Must update worker version in {}.'.format(file_path))

    # Add the number of errors and return in a nicely formatted way.
    error_count = len(result) - 1
    if error_count == 0:
        return '', 0
    result.append('\n{} issues found analysing modified files.'
                  .format(error_count))
    return '\n\n'.join(result), error_count, fatal


def reduce_cppcheck(file_line_mapping, **extra):
    """
    Runs CppCheck on the project with the default configured rules. The output
    is reduced to only contain entries from the Git change set.

    :param file_line_mapping: Mapping of files with changed lines (obtained
        `get_git_line_sets()`).
    :param extra: Optional keyword arguments:
        `platform`: A specific platform to test for, as used in
                    `include/mega/` (default: detect local system's platform).
    :return: A tuple containing the formatted string suitable for output and
        an integer containing the number of failed rules.
    """
    logging.info('Obtaining CppCheck output ...')
    platform = platform = PLATFORMS[os.name]
    if 'platform' in extra:
        # Override if given.
        platform = extra['platform']

    # Get the CppCheck output.
    os.chdir(PROJECT_PATH)
    command = config.CPPCHECK_COMMAND.format(command=config.CPPCHECK_BIN,
                                             platform=platform)
    output = None
    try:
        output = subprocess.check_output(command.split(),
                                         stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as ex:
        # CppCheck found something, so it has returned an error code.
        # But we still want the output in the same fashion.
        output = ex.output
    output = output.decode('utf8').split('\n')

    # Go through output and collect only relevant lines to the result.
    logging.debug('Reducing CppCheck output ...')
    result = ['\nCppCheck output:\n================\n']
    cppcheck_expression = re.compile(r'^(.+);(\d+);')
    for line in output:
        parse_result = cppcheck_expression.findall(line)
        # Check if we've got a relevant line.
        if parse_result:
            file_name, line_no = parse_result[0][0], int(parse_result[0][1])
            file_name = tuple(re.split(PATH_SPLITTER, file_name))
            # Check if the line is part of our selection list.
            if line_no in file_line_mapping[file_name]:
                formatted = '; '.join(line.split(';'))
                result.append(formatted)

    # Add the number of errors and return in a nicely formatted way.
    error_count = len(result) - 1
    result.append('\n{} errors'.format(error_count))
    return '\n'.join(result), error_count


def reduce_nsiqcppstyle(file_line_mapping, **extra):
    """
    Runs N'SIQ CppStyle on the project with the project configured rules.
    Thet output is reduced to only contain entries from the Git change set.

    :param file_line_mapping: Mapping of files with changed lines (obtained
        `get_git_line_sets()`).
    :param extra: Optional keyword arguments.
    :return: A tuple containing the formatted string suitable for output and
        an integer containing the number of failed rules.
    """
    logging.info("Obtaining N'SIQ CppStyle output ...")

    # Get the output.
    outfile = tempfile.mktemp()
    os.chdir(PROJECT_PATH)
    command = config.NSIQCPPSTYLE_COMMAND.format(binary=config.NSIQCPPSTYLE_BIN,
                                                 outfile=outfile)

    # Just capturing the console output to keep things quiet.
    consoleoutput = None
    try:
        consoleoutput = subprocess.check_output(command.split(),
                                                stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as ex:
        # CppCheck found something, so it has returned an error code.
        # But we still want the output in the same fashion.
        consoleoutput = ex.output

    # Get the output and delete the outfile.
    output = open(outfile, 'rt').read().split('\n')
    os.remove(outfile)

    # Go through output and collect only relevant lines to the result.
    logging.debug("Reducing N'SIQ CppStyle output ...")
    result = ["\nN'SIQ CppStyle output:\n======================\n"]
    # This stunt is required to fix Windows path problems with backslashes.
    base_path = os.path.join(PROJECT_PATH, '')
    if os.name == 'nt':
        base_path = base_path.replace('\\', '\\\\')
    nsiqcppstyle_expression = re.compile(r'^{}(.+?),(\d+),(.+),'
                                         .format(base_path))
    for line in output:
        parse_result = nsiqcppstyle_expression.findall(line)
        # Check if we've got a relevant line.
        if parse_result:
            file_name = tuple(re.split(PATH_SPLITTER, parse_result[0][0]))
            line_no = int(parse_result[0][1])
            rest = parse_result[0][2]
            # Check if the line is part of our selection list.
            if line_no in file_line_mapping[file_name]:
                formatted = ', '.join(['/'.join(file_name), str(line_no)]
                                      + rest.split(','))
                result.append(formatted)

    # Add the number of errors and return in a nicely formatted way.
    error_count = len(result) - 1
    result.append('\n{} errors'.format(error_count))
    return '\n'.join(result), error_count


def reduce_verapp(file_line_mapping, **extra):
    """
    Runs Vera++ on the project with the project configured rules. The output
    is reduced to only contain entries from the Git change set.

    :param file_line_mapping: Mapping of files with changed lines (obtained
        `get_git_line_sets()`).
    :param extra: Optional keyword arguments.
    :return: A tuple containing the formatted string suitable for output and
        an integer containing the number of failed rules.
    """
    logging.info('Obtaining Vera++ output ...')

    # Collect all C++ source files.
    cpp_source_expression = re.compile(r'\.(h|cpp)$')
    source_files = [os.path.join(dirpath, name)
                    for dirpath, _, items in os.walk(PROJECT_PATH)
                    for name in items
                    if cpp_source_expression.findall(name.lower())]

    # Get the Vera++ output.
    os.chdir(PROJECT_PATH)
    command = config.VERAPP_COMMAND.format(command=config.VERAPP_BIN,
                                           rules=' '.join(['-R {}'.format(item)
                                                           for item in config.VERAPP_RULES]))
    output = None
    try:
        process = subprocess.Popen(command.split(),
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT,
                                   stdin=subprocess.PIPE)
        output, _ = process.communicate(bytes('\n'.join(source_files)
                                        .encode('ASCII')))
    except subprocess.CalledProcessError as ex:
        # Vera++ found something, so it has returned an error code.
        # But we still want the output in the same fashion.
        output = ex.output
    output = output.decode('utf8').split('\n')

    # Go through output and collect only relevant lines to the result.
    result = ['\nVera++ output:\n==============\n']
    # This stunt is required to fix Windows path problems with backslashes.
    base_path = os.path.join(PROJECT_PATH, '')
    if os.name == 'nt':
        base_path = base_path.replace('\\', '\\\\')
    verapp_expression = re.compile(r'^{}(.+?):(\d+): '.format(base_path))
    for line in output:
        parse_result = verapp_expression.findall(line)
        # Check if we've got a relevant line.
        if parse_result:
            file_name, line_no = parse_result[0][0], int(parse_result[0][1])
            file_name = tuple(re.split(PATH_SPLITTER, file_name))
            # Check if the line is part of our selection list.
            # TODO: find proper file name sub-set (remove base path)
            if line_no in file_line_mapping[file_name]:
                result.append(line)

    # Add the number of errors and return in a nicely formatted way.
    error_count = len(result) - 1
    result.append('\n{} errors'.format(error_count))
    return '\n'.join(result), error_count


def main(base, target, norules, branch, jscpd):
    """
    Run the ESLint tests and present output ont eh console via print.
    """
    CHECKER_MAPPING = {'eslint': reduce_eslint,
                       'htmlhint': reduce_htmlhint,
                       'stylelint': reduce_stylelint,
                       'validator': reduce_validator,
                       'cppcheck': reduce_cppcheck,
                       'nsiqcppstyle': reduce_nsiqcppstyle,
                       'vera++': reduce_verapp}

    global BASE_BRANCH
    BASE_BRANCH = base

    file_line_mapping = get_git_line_sets(base, target)
    results = []
    total_errors = 0
    for checker in config.checkers:
        worker = CHECKER_MAPPING[checker]
        extra_options = config.extra_options[checker]
        result = worker(file_line_mapping, **extra_options)
        fatal = 0
        error_count = result[1]
        if len(result) > 2:
            fatal = result[2]
        result = result[0].rstrip();
        if result:
            results.append(result)
        total_errors += error_count

        # If a fatal issue is found, halt execution and quit
        # if fatal > 0:
            # break

    count = len(results)
    warnings = count - total_errors
    if count:
        logging.info('Output of reduced results ...')
        if sys.version_info[0] == 2:
            print('\n\n'.join(results).rstrip().encode("utf-8"))
        else:
            print('\n\n'.join(results).rstrip())

    if jscpd and copypaste_detector(file_line_mapping):
        total_errors += 1

    if total_errors:
        sys.exit(1)

    branch_commits, authors = get_commits_in_branch(branch)
    if branch_commits > 10:
        print('\nToo many commits in this branch, please squash them using scripts/squash.sh')
        if authors > 1:
            print('WARNING: {} authors have contributed in this branch, '
                  'consider squashing your commits only\n         by manually running '
                  '"git rebase -i --autosquash {}", unless they do not care.'.format(authors, base))
        sys.exit(0)

    if warnings:
        print('\nAll fine, but there were some warnings you may want to look into.')
        sys.exit(0)

    print('\nEverything seems Ok.')


if __name__ == '__main__':
    # Set up logging.
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)s\t%(asctime)s %(message)s')

    # Setup the command line argument parser.
    DESCRIPTION = ('Filter output from static code analyser and style checker '
                   'to only contain content relevant to a diff '
                   '(e. g. between commits or tips of branches). '
                   'This tool will filter output from ESLint.')
    EPILOG = 'Note: if no revision (commit ID) is given, the branch tip will be used.'
    parser = argparse.ArgumentParser(description=DESCRIPTION, epilog=EPILOG)
    parser.add_argument('--norules', default=False, action='store_true',
                        help="Don't show rule names with description (default: show rules names)")
    parser.add_argument('--jscpd', default=False, action='store_true',
                        help="Run the nodejs package jscpd to detect copy/paste code.")
    parser.add_argument('--branch', type=str, help='Source branch name.', required=False, default=None)
    parser.add_argument('base',
                        help='base revision or name of base branch')
    parser.add_argument('target', nargs='?', default='',
                        help=('target revision or name of target branch'
                              ' (default: tip of current branch)'))

    args = parser.parse_args()

    main(args.base, args.target, args.norules, args.branch, args.jscpd)
