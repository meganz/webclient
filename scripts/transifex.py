#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Transifex Language Import and Export.

This script is used to:
    - Export languages from Transifex for Webclient strings
    - Import new strings to Transifex when working in a branch
    - Prepare production language files from exported strings from Transifex

Requirements:
    - Copy `transifex.json.example` and rename them to `transifex.json`
    - Create a Transifex token and assign it to a system environment variable as `TRANSIFEX_TOKEN`
        - Note: As a fallback, we can also add a property `TOKEN` in `transifex.json`

This script will work with both Python 2.7 as well as 3.x.
"""

import copy, json, os, sys, re, subprocess, time, io, random, argparse
from threading import Thread
from collections import OrderedDict
from functools import cmp_to_key
version = sys.version_info.major
if version == 2:
    from urllib2 import Request, urlopen, install_opener, build_opener, HTTPRedirectHandler, HTTPError
else:
    from urllib.request import Request, urlopen, install_opener, build_opener, HTTPRedirectHandler
    from urllib.error import HTTPError

base_url = None
organisation_id = None
project_id = None
resource_slug = None
gitlab_develop_url = None
transifex_token = None
gitlab_token = None

base_url = os.getenv('TRANSIFEX_BASE_URL')
organisation_id = os.getenv('TRANSIFEX_ORGANISATION')
project_id = os.getenv('TRANSIFEX_PROJECT')
resource_slug = os.getenv('TRANSIFEX_RESOURCE')
gitlab_develop_url = os.getenv('GITLAB_DEVELOP_STRINGS_URL')
gitlab_token = os.getenv('GITLAB_TOKEN')
transifex_token = os.getenv('TRANSIFEX_TOKEN')

config_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), "transifex.json")
if not os.path.exists(config_file):
    config_file += ".example"

if os.path.exists(config_file):
    transifex_config_file = open(config_file, "r")
    content = transifex_config_file.read()
    transifex_config_file.close()
    transifex_config = json.loads(content)

    base_url = transifex_config.get('BASE_URL') or base_url
    organisation_id = transifex_config.get('ORGANISATION') or organisation_id
    project_id = transifex_config.get('PROJECT') or project_id
    resource_slug = transifex_config.get('RESOURCE') or resource_slug
    gitlab_develop_url = transifex_config.get('GITLAB_DEVELOP_STRINGS_URL') or gitlab_develop_url
    gitlab_token = transifex_config.get('GITLAB_TOKEN') or gitlab_token
    transifex_token = transifex_config.get('TRANSIFEX_TOKEN') or transifex_token

if not base_url or not organisation_id or not project_id or not resource_slug or not gitlab_develop_url or not transifex_token:
     print("ERROR: Incomplete Transifex settings.")
     sys.exit(1)

BASE_URL = base_url
RESOURCE = resource_slug
GITLAB_DEVELOP_STRINGS_URL = gitlab_develop_url
GITLAB_TOKEN = gitlab_token
PROJECT_ID = "o:" + organisation_id + ":p:" + project_id
HEADER = {
    "Authorization": "Bearer " + transifex_token,
    "Content-Type": "application/vnd.api+json"
}

REMAPPED_CODE = {
    "pt": "br",
    "ja": "jp",
    "zh_CN": "cn",
    "zh_TW": "ct",
    "ko": "kr"
}

def print_error(errors):
    for error in errors:
        print('ERROR {}: {}.'.format(error['status'], error['detail']))

def sanitise_string(string, convert_quotes, escape_tag):
    # We do not want to convert the quotes that are in between tags
    tags = re.findall("<[^sd][^>]*>", string)
    if len(tags) > 0:
        i = 0
        for tag in tags:
            string = string.replace(tag, "@@@tag" + str(i) + "@@@")
            i += 1

    # Quotes
    quotes = [
        ['"(.+)"', "\u201c\g<1>\u201d"],               # Enclosing double quotes
        ["(\W)'(.+)'", "\g<1>\u2018\g<2>\u2019"],      # Enclosing single quotes
        ["(\w)'", "\g<1>\u2019"],                      # Remaining single quote
    ]

    replacements = [["\.\.\.", "\u2026"]]

    if convert_quotes:
        replacements = replacements + quotes

    for replace in replacements:
        string = re.sub(replace[0], replace[1], string)

    if len(tags) > 0:
        i = 0
        for tag in tags:
            string = string.replace("@@@tag" + str(i) + "@@@", tag)
            i += 1

    # Less than / start angle bracket & greater than / end angle bracket
    if escape_tag:
        replacements = [["<","&lt;"],[">","&gt;"]]
        for replace in replacements:
            string = re.sub(replace[0], replace[1], string)

    return string

def natural_sort(a,b):
    key1 = a[0]
    key2 = b[0]
    if key1.isnumeric() and key2.isnumeric():
        key1 = int(key1)
        key2 = int(key2)
    if key1 > key2:
        return 1
    elif key1 < key2:
        return -1
    else:
        return 0

def create_file(language, content, is_prod = False):
    if language == "strings" and is_prod:
        return
    for key, data in content.items():
        if language == "strings":
            content[key]['string'] = sanitise_string(data['string'], True, False)
        elif language == "en":
            content[key] =  sanitise_string(data['string'], True, True)
        else:
            content[key] =  sanitise_string(data['string'], False, True)

    # Natural sort
    sorted_dict = OrderedDict(sorted(content.items(), key=cmp_to_key(natural_sort)))

    filename = language + "_prod" if is_prod else language
    with io.open(os.path.dirname(os.path.abspath(__file__)) + "/../lang/" + filename + ".json", 'w+', newline='\n') as file:
        file.write(u"{}".format(json.dumps(sorted_dict, indent=4, separators=(',',": ")) + "\n"))

def prepare_english_string(resource):
    url = BASE_URL + "/resource_strings_async_downloads"
    payload = {
        "data": {
            "attributes": {
                "content_encoding": "text",
                "file_type": "default"
            },
            "relationships": {
                "resource": {
                    "data": {
                        "id": PROJECT_ID + ":r:" + resource,
                        "type": "resources"
                    }
                }
            },
            "type": "resource_strings_async_downloads"
        }
    }
    return {'strings': {'url': url, 'payload': payload}}

def prepare_translation_string(resource, lang):
    language_strings = {}
    url = BASE_URL + "/projects/" + PROJECT_ID + "/languages"
    request = Request(url, headers=HEADER)
    response = urlopen(request)
    content = json.loads(response.read().decode('utf8'))
    if response.code != 200:
        print_error(content['errors'])
        return False
    else:
        languages = content['data']
        for language in languages:
            if lang == "all" or language['id'] in lang:
                url = BASE_URL + "/resource_translations_async_downloads"
                payload = {
                    "data": {
                        "attributes": {
                            "content_encoding": "text",
                            "file_type": "default",
                            "mode": "default",
                            "pseudo": False,
                        },
                        "relationships": {
                            "language": {
                                "data": {
                                    "id": language['id'],
                                    "type": "languages",
                                }
                            },
                            "resource": {
                                "data": {
                                    "id": PROJECT_ID + ":r:" + resource,
                                    "type": "resources"
                                }
                            }
                        },
                        "type": "resource_translations_async_downloads"
                    }
                }
                language_code = language['attributes']['code']
                language_code = REMAPPED_CODE[language_code] if language_code in REMAPPED_CODE else language_code
                language_strings[language_code] = {'url': url, 'payload': payload}
    return language_strings

def download_languages(resource, lang = []):
    languages = {}
    all_requests = {}
    if lang:
        lang = list(set(lang))
        if "en" in lang:
            all_requests.update(prepare_english_string(resource))
            lang.remove("en")
        for code_from, code_to in REMAPPED_CODE.items():
            if code_to in lang:
                index = lang.index(code_to)
                lang[index] = code_from
        lang = list(map(lambda code: "l:" + code, lang))
        lang_requests = prepare_translation_string(resource, lang)
    else:
        all_requests = prepare_english_string(resource)
        lang_requests = prepare_translation_string(resource, "all")

    if lang_requests:
        all_requests.update(lang_requests)

    def transifex_download_requests(language, request):
        class NoRedirect(HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None

        request = Request(request['url'], headers=HEADER, data=json.dumps(request['payload']).encode('utf8'))
        response = urlopen(request)
        content = json.loads(response.read().decode('utf8'))
        if response.code == 202:
            if content['data']['attributes']['status'] == 'failed':
                print_error(content['data']['attributes']['errors'])
                return
            else:
                download_link = content['data']['links']['self']
                opener = build_opener(NoRedirect)
                install_opener(opener)
                for i in range(50):
                    # This is to give Transifex some time to pre-process the data before trying to re-fetch
                    time.sleep(min(4, max(1, i / 10)) + (random.randint(0, 1000) / 1000.0))
                    try:
                        status_request = Request(download_link, headers=HEADER)
                        status_response = urlopen(status_request)
                    except HTTPError as e:
                        if e.code == 303:
                            download_response = urlopen(e.headers['Location'])
                            download_content = json.loads(download_response.read().decode('utf8'))
                            languages[language] = download_content
                            print('{} => Completed'.format(language))
                            return
                        elif e.code != 200:
                            download_content = json.loads(status_response.read().decode('utf8'))
                            print_error(download_content['errors'])
                            return
                print('{} => ERROR: Maximum file fetch limit reached.'.format(language))
        else:
            print_error(content['errors'])

    threads = []
    for language, request in all_requests.items():
        t = Thread(target=transifex_download_requests, args=(language, request))
        threads.append(t)
        t.start()

    for thread in threads:
        thread.join()

    return languages

def get_branch_resource_name(is_upload = False, is_force = False):
    branch_name = subprocess.check_output(['git', 'symbolic-ref', '--short','-q','HEAD'], universal_newlines=True).strip()
    if branch_name in ["master", "develop"]:
        if is_upload:
            print("ERROR: Updating string is not allowed in this branch.")
        return False
    branch_resource_name =  RESOURCE + "-" + re.sub('[^A-Za-z0-9]+', '', branch_name)
    url = BASE_URL + "/resources/" + PROJECT_ID + ":r:" + branch_resource_name
    request = Request(url, headers=HEADER)
    try:
        response = urlopen(request)
        content = json.loads(response.read().decode('utf8'))
        if response.code == 200:
            print("Resource file is found for this branch. ")
            return branch_resource_name
    except HTTPError as e:
        if e.code == 404:
            print("Resource file does not exist for this branch. ")
            if not is_upload:
                print("")
                return False
            if is_force:
                version = sys.version_info.major
                input_note = "WARNING: Only create an empty branch resource if sub-branches will be made for this branch in future. Type \"YES\" to proceed: "
                if version == 2:
                    user_input = raw_input(input_note)
                else:
                    user_input = input(input_note)
                if user_input != "YES":
                    return True
            print("Creating new resource... ")
            sys.stdout.flush()
            url = BASE_URL + "/resources"
            payload = {
                "data": {
                    "attributes": {
                        "name": branch_resource_name,
                        "slug": branch_resource_name,
                    },
                    "relationships": {
                        "i18n_format": {
                            "data": {
                                "id": "STRUCTURED_JSON",
                                "type": "i18n_formats",
                            }
                        },
                        "project": {
                            "data": {
                                "id": PROJECT_ID,
                                "type": "projects"
                            }
                        }
                    },
                    "type": "resources"
                }
            }
            request = Request(url, headers=HEADER, data=json.dumps(payload).encode('utf8'))
            response = urlopen(request)
            content = json.loads(response.read().decode('utf8'))
            if response.code != 201:
                print_error(content['errors'])
                return False
            print("")
            print("New Resource {} has been created.".format(branch_resource_name))
            return branch_resource_name
        else:
            print_error(content['errors'])
            return False

def send_upload_request(url, payload):
    request = Request(url, headers=HEADER, data=json.dumps(payload).encode('utf8'))
    response = urlopen(request)
    content = json.loads(response.read().decode('utf8'))
    if response.code != 202:
        print_error(content['errors'])
        return False

    # Get the file
    download_link = content['data']['links']['self']
    for i in range(10):
        time.sleep(3)
        request = Request(download_link, headers=HEADER)
        download_content = json.loads(urlopen(request).read())
        if 'errors' in download_content:
            print_error(content['errors'])
            return False
        elif 'data' in download_content and 'attributes' in download_content['data'] and 'status' in download_content['data']['attributes'] and \
                download_content['data']['attributes']['status'] not in ['processing', 'pending']:
            return response
    print("ERROR: Maximum file fetch limit reached.")
    return False

def merge_language(main, branch):
    print("Merging Main and Branch Language Files... ")
    sys.stdout.flush()
    for code, strings in branch.items():
        for key, data in strings.items():
            main[code][key] = data
    print("Completed.")

def string_validation(new_strings):
    valid_strings = True
    for key, data in new_strings.items():
        if 'string' not in data:
            print('ERROR: String with key {} has no string.'.format(key))
            valid_strings = False
        elif 'developer_comment' not in data:
            print('ERROR: String with key {} has no developer comment.'.format(key))
            valid_strings = False
        else:
            new_strings[key]['string'] = sanitise_string(data['string'], True, False)
            print('Accepted: String with key {} is valid.'.format(key))
    return valid_strings

def validate_strings(key_value_pairs):
    strings = {}
    duplicated_keys = []
    for key, value in key_value_pairs:
        if key in strings:
           duplicated_keys.append(key)
        else:
           strings[key] = value
    if len(duplicated_keys) > 0:
        print('ERROR: Duplicated key: {}'.format(", ".join(duplicated_keys)))
        sys.exit(1)
    return strings

def get_differences():
    new_strings_found = {}
    if not GITLAB_TOKEN:
        print("GITLAB_TOKEN is not set.")
        sys.exit(1)
    try:
        new_file = open(os.path.dirname(os.path.abspath(__file__)) + "/../lang/strings.json", "r")
        new_strings = json.loads(new_file.read(), object_pairs_hook=validate_strings)
        new_file.close()
    except IOError:
        print("ERROR: File not found.")
        sys.exit(1)

    gitlab_header = {'Private-Token': GITLAB_TOKEN}
    request = Request(GITLAB_DEVELOP_STRINGS_URL, headers=gitlab_header)
    try:
        response = urlopen(request)
        current_strings = json.loads(response.read())
    except HTTPError as e:
        if e.code == 401:
            print("ERROR: Invalid GitLab Token credentials.")
        else:
            print("ERROR: Cannot fetch strings.json from GitLab.")
        sys.exit(1)

    for new_key in new_strings:
        if new_key not in current_strings or new_strings[new_key]['string'] != current_strings[new_key]['string'] or new_strings[new_key]['developer_comment'] != current_strings[new_key]['developer_comment']:
            new_strings_found[new_key] = new_strings[new_key]

    if new_strings_found:
        print("New string(s) file found! Checking validity...")
        if not string_validation(new_strings_found):
            print("ERROR: Invalid new string(s).")
            sys.exit(1)
        else:
            print("New strings are valid! :)")
            return new_strings_found
    else:
        print("No changes found in strings.json")
        return False

def main():
    print("--- Transifex Language Management ---")
    languages = ""
    is_prod = False
    branch_resource_name = None

    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--production", nargs="?", help="Create production language files", const=True, default=False)
    parser.add_argument("-l", "--language", nargs="+", help="Select several languages to fetch in comma separated value. (Use Webclient's language code)")
    parser.add_argument("-u", "--update", nargs="*", help="Parse strings.json and update branch resource file", type=str)
    args = parser.parse_args()
    if args.production:
        is_prod = args.production
    elif args.language != None and len(args.language) > 0:
        try:
            languages = args.language[0].split(",")
        except:
            print("Invalid language arguments")
            sys.exit(1)
    elif args.update != None:
        print("~ Import started ~")
        new_strings = get_differences()
        is_force = not new_strings and len(args.update) > 0 and args.update[0] == "force"
        if new_strings or is_force:
            branch_resource_name = get_branch_resource_name(True, is_force)
            if not branch_resource_name:
                print("Failed to get branch resource name")
                sys.exit(1)

        if new_strings:
            # Push new string to the branch resource file
            print("Pushing new strings to branch resource file... ")
            sys.stdout.flush()
            url = BASE_URL + "/resource_strings_async_uploads"
            payload = {
                "data": {
                    "attributes": {
                        "content": json.dumps(new_strings),
                        "content_encoding": "text",
                    },
                    "relationships": {
                        "resource": {
                            "data": {
                                "id": PROJECT_ID + ":r:" + branch_resource_name,
                                "type": "resources",
                            },
                        },
                    },
                    "type": "resource_strings_async_uploads",
                },
            }
            success = send_upload_request(url, payload)
            if success:
                print("Completed")
        print("~ Import completed ~")
        print("")

    print("~ Export started ~")
    print("Fetching Main Language Files...")
    lang = download_languages(RESOURCE, languages)
    if not lang:
        print("Failed to fetch main language files.")
        sys.exit(1)

    print("")
    if not branch_resource_name:
        branch_resource_name = get_branch_resource_name()
    if not is_prod and branch_resource_name:
        print("Fetching Branch Language Files...")
        lang_branch = download_languages(branch_resource_name, languages)
        if lang_branch:
            merge_language(lang, lang_branch)
        else:
            print("Failed to fetch branch language files.")
        print("")

    # Copy strings to en if lang["strings"] exists
    if "strings" in lang:
        lang["en"] = copy.deepcopy(lang["strings"])

    print("Creating Translation Files... ")
    sys.stdout.flush()
    for code, data in lang.items():
        create_file(code, data, is_prod)
    print("Completed")
    print("~ Export completed ~")

try:
    main()
except KeyboardInterrupt:
    os._exit(1)
