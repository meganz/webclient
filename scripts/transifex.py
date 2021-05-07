#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Transifex Language Import and Export.

This script is used to:
    - Export languages from Transifex for Webclient strings
    - Import new strings to Transifex when working in a branch
    - Prepare production language files from exported strings from Transifex

Requirements:
    - `requests` Python Library: pip install requests
    - `natsort` Python Library: pip install 'natsort<7.0.0'
        - Note: Lower version is used to keep support for Python 2.7
    - Copy `transifex.json.example` and rename them to `transifex.json`
    - Create a Transifex token and assign it to a system environment variable as `TRANSIFEX_TOKEN`
        - Note: As a fallback, we can also add a property `TOKEN` in `transifex.json`


This script will work with both Python 2.7 as well as 3.x.
"""

import copy, json, os, requests, sys, re, subprocess, time, io
from threading import Thread
from collections import OrderedDict
from natsort import natsorted # Use version 6.2.1

dir_path = os.path.dirname(os.path.realpath(__file__))
transifex_config_file = open(dir_path + "/transifex.json", "r")
content = transifex_config_file.read()
transifex_config_file.close()
transifex_config = json.loads(content)
BASE_URL = transifex_config['BASE_URL']
PROJECT_ID = "o:" + transifex_config['ORGANISATION'] + ":p:" + transifex_config['PROJECT']
RESOURCE = transifex_config['RESOURCE']
token = os.getenv('TRANSIFEX_TOKEN')
if not token:
    token = transifex_config['TOKEN']
HEADER = {
    "Authorization": "Bearer " + token,
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
        print("Error " + error['status'] + ": " + error['detail'] + ".")

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
    sorted_order = natsorted(content)
    index_map = {v: i for i, v in enumerate(sorted_order)}
    sorted_dict = OrderedDict(sorted(content.items(), key=lambda pair:index_map[pair[0]]))

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

def prepare_translation_string(resource):
    language_strings = {}
    url = BASE_URL + "/projects/" + PROJECT_ID + "/languages"
    response = requests.get(url, headers=HEADER)
    content = response.json()
    if response.status_code != 200:
        print_error(content['errors'])
        return False
    else:
        languages = content['data']
        for language in languages:
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

def download_languages(resource, english_only = False):
    languages = {}
    all_requests = prepare_english_string(resource)
    if not english_only:
        lang = prepare_translation_string(resource)
        if not all_requests or not lang:
            return False
        all_requests.update(lang)

    def transifex_download_requests(language, request):
        response = requests.post(request['url'], headers=HEADER, data=json.dumps(request['payload']))
        content = response.json()
        if response.status_code == 202:
            if content['data']['attributes']['status'] == 'failed':
                print_error(content['data']['attributes']['errors'])
                return
            else:
                download_link = content['data']['links']['self']
                for i in range(50):
                    time.sleep(3) # This is to give Transifex some time to pre-process the data before trying to re-fetch
                    download_response = requests.get(download_link, headers=HEADER, allow_redirects=False)
                    if download_response.status_code == 303:
                        download_content = requests.get(download_response.url, headers=HEADER).json()
                        languages[language] = download_content
                        print(language + " => Completed")
                        return
                    elif download_response.status_code != 200:
                        download_content = download_response.json()
                        print_error(download_content['errors'])
                        return
                print(language + " => Error: Maximum file fetch limit reached.")
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

def get_branch_resource_name(is_upload = False):
    branch_name = subprocess.check_output(['git', 'branch', '--show-current'], universal_newlines=True).strip()
    if branch_name in ["master", "develop"]:
        print("Error: Updating string is not allowed in this branch.")
        return False
    branch_resource_name =  RESOURCE + "-" + re.sub('[^A-Za-z0-9]+', '', branch_name)
    url = BASE_URL + "/resources/" + PROJECT_ID + ":r:" + branch_resource_name
    response = requests.get(url, headers=HEADER)
    content = response.json()
    if response.status_code == 200:
        return branch_resource_name
    elif response.status_code == 404:
        print("Resource file does not exist for this branch. ")
        if not is_upload:
            print("")
            return False
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
        response = requests.post(url, headers=HEADER, data=json.dumps(payload))
        content = response.json()
        if response.status_code != 201:
            print_error(content['errors'])
            return False
        print("")
        print("New Resource " + branch_resource_name + " has been created.")
        return branch_resource_name
    else:
        print_error(content['errors'])
        return False

def send_upload_request(url, payload):
    response = requests.post(url, headers=HEADER, data=json.dumps(payload))
    content = response.json()
    if response.status_code != 202:
        print_error(content['errors'])
        return False

    # Get the file
    download_link = content['data']['links']['self']
    for i in range(10):
        time.sleep(3)
        download_content = requests.get(download_link, headers=HEADER, allow_redirects=True).json()
        if 'errors' in download_content:
            print_error(content['errors'])
            return False
        elif 'data' in download_content and 'attributes' in download_content['data'] and 'status' in download_content['data']['attributes'] and \
                download_content['data']['attributes']['status'] not in ['processing', 'pending']:
            return response
    print("Error: Maximum file fetch limit reached.")
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
            print("Error: String with key " +  key + " has no string.")
            valid_strings = False
        elif 'developer_comment' not in data:
            print("Error: String with key " + key + " has no developer comment.")
            valid_strings = False
        else:
            new_strings[key]['string'] = sanitise_string(data['string'], True, False)
            print("Accepted: String with key " + key + " is valid.")
    return valid_strings

def main():
    print("Export Started")
    is_prod = False
    english_only = False
    branch_resource_name = None

    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == 'production':
            is_prod = True
        elif arg == 'english_only':
            english_only = True
        else:
            print("New string(s) file found! Checking validity...")
            try:
                if os.path.splitext(arg)[-1].lower() != '.json':
                    raise Exception()
                new_string_file = open(arg, "r")
                content = new_string_file.read()
                new_string_file.close()
                new_strings = json.loads(content)
                if not string_validation(new_strings):
                    raise Exception()
            except IOError:
                sys.exit("Error: File not found.")
            except:
                sys.exit("Error: Invalid new string(s).")
            print("New strings are valid! :)")

            branch_resource_name = get_branch_resource_name(True)
            if not branch_resource_name:
                sys.exit()

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
            print("")

    print("Fetching Main Language Files...")
    lang = download_languages(RESOURCE, english_only)
    if not lang:
        sys.exit("Failed to fetch main language files.")

    print("")
    if not branch_resource_name:
        branch_resource_name = get_branch_resource_name()
    if not is_prod and branch_resource_name:
        print("Fetching Branch Language Files...")
        lang_branch = download_languages(branch_resource_name, english_only)
        if lang_branch:
            merge_language(lang, lang_branch)
        else:
            print("Failed to fetch branch language files.")
        print("")

    # Copy strings to en
    lang["en"] = copy.deepcopy(lang["strings"])

    print("Creating Translation Files... ")
    sys.stdout.flush()
    for code, data in lang.items():
        create_file(code, data, is_prod)
    print("Completed")
    print("Export Completed")

try:
    main()
except KeyboardInterrupt:
    os._exit(1)
