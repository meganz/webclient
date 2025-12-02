import os, json, subprocess, re, args, requests
from xml.dom.minidom import parseString

config = {}
config["BASE_URL"] = ""
config["PROJECT"] = "ios"
config["TOKEN"] = os.getenv("WEBLATE_TOKEN")
config["COMPONENTS"] = {}
config["TEMPLATE_NAME"] = "en.strings"
config["FILE_FORMAT"] = "strings"
config["MIME"] = "text/plain"
config["FILE_ENCODING"] = {
    "localizable": "utf-16",
    "infoplist": "utf-16",
    "changelogs": "utf-16",
    "localizable_shared_lib": "utf-16",
    "lthpasscodeviewcontroller": "utf-16"
}

if args.update and args.component and "plurals" in args.component.lower():
    config["FILE_FORMAT"] = "stringsdict"
    config["TEMPLATE_NAME"] = "en.stringsdict"
    config["MIME"] = "application/xml"

script_dir = os.path.dirname(os.path.realpath(__file__)) + "/"
config_file = os.path.realpath(script_dir + "../translate.json")

ios_config = {}
ios_config["GITLAB_TOKEN"] = os.getenv("GITLAB_TOKEN")
ios_config["GITLAB_PROJ_ID"] = 193
ios_config["GITLAB_BRANCH"] = "develop"
ios_config["PROD_PATH"] = "/Modules/Presentation/MEGAL10n/Framework/MEGAL10n/MEGAL10n/Resources"

if not os.path.exists(config_file):
    print("Warning: Trying sample config")
    config_file = os.path.realpath(script_dir + "../translate.json.example")
if os.path.exists(config_file):
    config_file = open(config_file, "r")
    content = config_file.read()
    config_file.close()
    weblate_config = json.loads(content)

    config["BASE_URL"] = weblate_config.get("BASE_URL") or config["BASE_URL"]
    config["TOKEN"] = weblate_config.get("SOURCE_TOKEN") or config["TOKEN"]
    config["PROJECT"] = weblate_config.get("PROJECT") or config["PROJECT"]
    if args.library:
        config["PROJECT"] = weblate_config.get("LIB_PROJECT") or args.library
    config["MIME"] = weblate_config.get("MIME") or config["MIME"]
    config["FILE_FORMAT"] = weblate_config.get("FILE_FORMAT") or config["FILE_FORMAT"]
    config["TEMPLATE_NAME"] = weblate_config.get("TEMPLATE_NAME") or config["TEMPLATE_NAME"]
    config["FILE_ENCODING"] = weblate_config.get("FILE_ENCODING") or config["FILE_ENCODING"]

    ios_config["GITLAB_TOKEN"] = weblate_config.get("GITLAB_TOKEN") or ios_config["GITLAB_TOKEN"]
    ios_config["GITLAB_PROJ_ID"] = weblate_config.get("GITLAB_PROJ_ID") or ios_config["GITLAB_PROJ_ID"]
    ios_config["GITLAB_BRANCH"] = weblate_config.get("GITLAB_BRANCH") or ios_config["GITLAB_BRANCH"]
    ios_config["PROD_PATH"] = weblate_config.get("PROD_PATH") or ios_config["PROD_PATH"]

ios_config["GITLAB_URL"] = "https://code.developers.mega.co.nz/api/v4/projects/" + str(ios_config["GITLAB_PROJ_ID"]) + "/repository/files/$path%2FBase.lproj%2F$file/raw?ref=" + str(ios_config["GITLAB_BRANCH"])

def parse_strings_config():
    path = script_dir + "ios.conf"
    if args.library and os.path.exists(script_dir + args.library + ".conf"):
        path = script_dir + args.library + ".conf"
    if not os.path.exists(path):
        raise Exception("Missing configuration file for strings resources")
    with open(path, "r", encoding="utf-8") as file:
        config = file.read()
    config = [line for line in config.split('\n') if line.strip()]
    map = {}
    for line in config:
        tmp = line.split(" ")
        if len(tmp) == 2 and "-" not in tmp[0]:
            if os.path.exists(os.path.realpath(script_dir + "../../../" + tmp[1])):
                map[tmp[0]] = os.path.realpath(script_dir + "../../../" + tmp[1] + (args.start_path if args.start_path else ""))
            else:
                print("Error: The specified folder does not exist. " + os.path.realpath(script_dir + "../../../" + tmp[1]))
        else:
            print("Error: Invalid configuration: " + line)
    if len(map) == 0:
        print("Error: No valid configurations")
    return map

config["COMPONENTS"] = parse_strings_config()

remaps = {
    "zh_Hans": "zh-Hans",
    "zh_Hant": "zh-Hant"
}

# re.sub compatible version of PHP regex: /^[\pZ\pC]+|[\pZ\pC]+$/u as \p is not supported
unicode_regex = re.compile('^[\u0000-\u0020\u007F-\u00A0\u00AD\u0600-\u0605\u061C\u06DD\u070F\u08E2\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u2064\u2066-\u206F\u3000\uFEFF\uFFF9-\uFFFB\U000110BD\U000110CD\U00013430-\U00013438\U0001BCA0\U0001BCA3\U0001D173-\U0001D17A\U000E0001\U000E0020-\U000E007F]+|[\u0000-\u0020\u007F-\u00A0\u00AD\u0600-\u0605\u061C\u06DD\u070F\u08E2\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u2064\u2066-\u206F\u3000\uFEFF\uFFF9-\uFFFB\U000110BD\U000110CD\U00013430-\U00013438\U0001BCA0\U0001BCA3\U0001D173-\U0001D17A\U000E0001\U000E0020-\U000E007F]+$', re.UNICODE)
xml_tag_regex = re.compile(r'<[^[sd][^>]*>')

def validate_file(file_content, is_plurals=False):
    if is_plurals:
        try:
            parseString(file_content)
        except Exception as ex:
            print("Error: Failed to parse stringsdict file: " + str(ex))
            return False
        return file_content
    file_content = re.sub(unicode_regex, '', file_content)
    lines = file_content.split("\n")
    i = 0
    while i < len(lines):
        lines[i] = lines[i].strip()
        if "/*" == lines[i][0:2] and "*/" == lines[i][-2:len(lines[i])]:
            i = i # No-op. Valid comment
        elif len(lines[i]) >= 6 and lines[i][0] == "\"" and lines[i][-1] == ";":
            parts = lines[i].split("=", 1)
            key = parts[0].strip()[1:-1]
            string = parts[1].strip()[1:-2]
            if len(key) > 0 and len(string) > 0:
                key_matches = re.search('(?<!\\\\)(?:\\\\{2})*"', key)
                string_matches = re.search('(?<!\\\\)(?:\\\\{2})*"', string)
                if key_matches != None or string_matches != None:
                    print("Error: Invalid quote escapes on line " + str(i + 1))
                    return False
            else:
                print("Error: Invalid string line for line " + str(i + 1))
                return False
        else:
            print("Error: Invalid comment or string entry on line " + str(i + 1))
            return False
        i += 1
    return file_content

def get_file_basename(component_id):
    if "-" in component_id:
        if "plurals" in component_id:
            return component_id.replace("plurals", "Localizable") + ".stringsdict"
        else:
            return component_id[0].upper() + component_id[1:] + ".strings"
    else:
        if "plurals" in component_id:
            return "Localizable.stringsdict"
        elif "localizable" in component_id:
            return "Localizable.strings"
        elif "infoplist" in component_id:
            return "InfoPlist.strings"
        else: 
            print("WARN: Unexpected component name. Cannot retrieve base file name for " + component_id)
            print("Defaulting to Localizable.strings")
            return "Localizable.strings"
        
def gitlab_download(component_id, language = "Base"):
    if "LTHPasscodeViewController" in component_id:
        return False
    headers = {
        "PRIVATE-TOKEN": ios_config["GITLAB_TOKEN"]
    }
    url = ios_config["GITLAB_URL"].replace("$file", get_file_basename(component_id)).replace("$path", ios_config["PROD_PATH"][1:].replace("/", "%2F"))
    if language != "Base":
        if language in remaps:
            language = remaps[language]
        url = url.replace("Base.lproj", language + ".lproj")
    resp = requests.get(url, headers=headers)
    if resp.status_code == 401:
        print("Error: Invalid Gitlab token")
        return False
    if resp.status_code == 404:
        print("Error: Unable to find file in Gitlab: " + component_id + " " + language)
        return False
    if resp.status_code != 200:
        print("Error: Unknown issue from Gitlab: " + str(resp.status_code))
        return False
    content = resp.text
    return content if content else False

def replace_characters(string, upload):
    replace = [
        r"'''",                                                # A. Triple prime
        r'(\W|^)"(\w)',                                        # B. Beginning double quote
        r'(“[^"]*)"([^"]*$|[^“"]*“)',                          # C. Ending double quote
        r'([^0-9])"',                                          # D. Remaining double quote at the end of word
        r"''",                                                 # E. Double prime as two single quotes
        r"(\W|^)'(\S)",                                        # F. Beginning single quote
        r"([A-z0-9])'([A-z])",                                 # G. Conjunction's possession
        r"(‘)([0-9]{2}[^’]*)(‘([^0-9]|$)|$|’[A-z])",           # H. Abbreviated years like '93
        r"((‘[^']*)|[A-z])'([^0-9]|$)",                        # I. Ending single quote
        r"(\B|^)‘(?=([^‘’]*’\b)*([^‘’]*\B\W[‘’]\b|[^‘’]*$))",  # J. Backwards apostrophe
        r'"',                                                  # K. Double prime
        r"'",                                                  # L. Prime
        r"\.\.\."                                              # M. Ellipsis
    ]
    replace_to = [
        r'‴',        # A
        r'\1“\2',    # B
        r'\1”\2',    # C
        r'\1”',      # D
        r'″',        # E
        r"\1‘\2",    # F
        r"\1’\2",    # G
        r"’\2\3",    # H
        r"\1’\3",    # I
        r"\1’",      # J
        r"″",        # K
        r"′",        # L
        r"…"         # M
    ]
    tags = xml_tag_regex.findall(string)
    for i in range(len(tags)):
        string = string.replace(tags[i], " <t " + str(i) + "> ")
    if upload:
        string = string.replace("\r\n", "[Br]")
        string = string.replace("\r", "[Br]")
        string = string.replace("\n", "[Br]")
        string = string.replace(r"\r\n", "[Br]")
        string = string.replace(r"\r", "[Br]")
        string = string.replace(r"\n", "[Br]")
        string = string.replace("\\", "")
        for i in range(len(replace)):
            string = re.sub(replace[i], replace_to[i], string)
    else:
        string = re.sub(replace[12], replace_to[12], string)
        string = string.replace("[x]", "[X]")
        string = string.replace("[a]", "[A]")
        string = string.replace("[/a]", "[/A]")
        string = string.replace("[b]", "[B]")
        string = string.replace("[/b]", "[/B]")
        string = string.replace("[a1]", "[A1]")
        string = string.replace("[/a1]", "[/A2]")
        string = string.replace("[a2]", "[A2]")
        string = string.replace("[/a2]", "[/A2]")
        string = string.replace("[x1]", "[X1]")
        string = string.replace("[/x1]", "[/X1]")
        string = string.replace("[x2]", "[X2]")
        string = string.replace("[/x2]", "[/X2]")
        string = string.replace("\n", "")
        string = string.replace("\r", "")
        string = string.replace("[Br]", r"\n")

    for i in range(len(tags)):
        string = string.replace(" <t " + str(i) + "> ", tags[i])
    return string


def subnodes_as_text(parent):
    node_value = ""
    for node in parent.childNodes:
        node_value = node_value + node.toxml()
    return node_value

def get_plural_data(node, upload):
    map = {
        "var": subnodes_as_text(node.getElementsByTagName('string')[0]),
        "ctx": subnodes_as_text(node.getElementsByTagName('key')[1]),
        "str": {}
    }
    i = 0
    key = ""
    skip = 2
    data_dict = node.getElementsByTagName('dict')[0]
    while i < len(data_dict.childNodes):
        child = data_dict.childNodes[i]
        if child.nodeType == child.ELEMENT_NODE:
            if skip > 0:
                skip -= 1
            else:
                if child.tagName == "key":
                    key = subnodes_as_text(child)
                elif child.tagName == "string":
                    map["str"][key] = replace_characters(subnodes_as_text(child), upload)
        i += 1
    return map

def content_to_map(file_content, upload, is_plurals=False):
    map = {}
    if is_plurals:
        doc = parseString(file_content)
        root_dict = doc.getElementsByTagName('dict')[0]
        string_key = ""
        for node in root_dict.childNodes:
            if node.nodeType == node.ELEMENT_NODE:
                if node.tagName == "key":
                    string_key = subnodes_as_text(node)
                elif node.tagName == "dict":
                    map[string_key] = get_plural_data(node, upload)
    else:
        file_content = re.sub(unicode_regex, '', file_content)
        lines = file_content.split("\n")
        i = 0
        context = ""
        while i < len(lines):
            lines[i] = lines[i].strip()
            if "/*" == lines[i][0:2] and "*/" == lines[i][-2:len(lines[i])]:
                context = lines[i][2:-2].strip()
            elif len(lines[i]) >= 6 and lines[i][0] == "\"" and lines[i][-1] == ";":
                parts = lines[i].split("=", 1)
                map[parts[0].strip()[1:-1]] = {
                    'c': context,
                    's': replace_characters(parts[1].strip()[1:-2], upload)
                }
            i += 1
    return map

def tagify(tag, value):
    return "<" + tag + ">" + value + "</" + tag + ">"

def indent_xml(lines):
    result = ""
    padding = 0
    for i in range(len(lines)):
        token = lines[i].lstrip()
        matches = re.search(r'.+<\/\w[^>]*>$', token)
        if matches == None:
            matches = re.search(r'^<\/\w', token)
            if matches == None:
                matches = re.search(r'^<\w[^>]*[^\/]>.*$', token)
                if matches == None:
                    indent = 0
                else:
                    indent = 2
            else:
                padding -= 2
                indent = 0
        else:
            indent = 0
        line = token.rjust(len(token) + padding, ' ')
        result = result + line + "\n"
        padding += indent
    return result.strip()

def map_to_content(map, is_plurals=False):
    file = ""
    if is_plurals:
        file = []
        file.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
        file.append("<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">")
        file.append("<plist version=\"1.0\">")
        file.append("<dict>")
        for key in map:
            file.append(tagify("key", key))
            file.append("<dict>")
            file.append(tagify("key", "NSStringLocalizedFormatKey"))
            file.append(tagify("string", map[key]["var"]))
            file.append(tagify("key", map[key]["ctx"]))
            file.append("<dict>")
            file.append(tagify("key", "NSStringFormatSpecTypeKey"))
            file.append(tagify("string", "NSStringPluralRuleType"))
            for sub_key in map[key]["str"]:
                file.append(tagify("key", sub_key))
                file.append(tagify("string", map[key]["str"][sub_key]))
            file.append("</dict>")
            file.append("</dict>")
        file.append("</dict>")
        file.append("</plist>")
        return indent_xml(file)
    else:
        for key in map:
            file += "/* " + map[key]["c"] + " */\n"
            file += "\"" + key + "\"=\"" + map[key]["s"] + "\";\n"
    return file.strip()

def strings_equal(string_a, string_b, is_plurals=False):
    if is_plurals:
        if string_a["ctx"] != string_b["ctx"]:
            return False
        if string_a["var"] != string_b["var"]:
            return False
        for key in string_a["str"]:
            if string_a["str"][key] != string_b["str"][key]:
                return False
    else:
        if string_a["c"] != string_b["c"]:
            return False
        if string_a["s"] != string_b["s"]:
            return False
    return True

def missing_developer_comments(content_map, is_plurals=False):
    result = False
    if is_plurals:
        return result
    
    for key in content_map:
        if "c" not in content_map[key] or content_map[key]["c"].strip() == "":
            print("Invalid developer comment found for string key: " + key)
            result = True
    return result

def process_as_download(file_content, is_plurals):
    return map_to_content(content_to_map(file_content, False, is_plurals), is_plurals)

def process_as_upload(file_content, is_plurals):
    return map_to_content(content_to_map(file_content, True, is_plurals), is_plurals)

def do_merge(component_content, branch_component_content, upload, is_plurals):
    full_map = content_to_map(component_content, upload, is_plurals)
    part_map = content_to_map(branch_component_content, upload, is_plurals)
    for key in part_map:
        full_map[key] = part_map[key]
    return map_to_content(full_map, is_plurals)

def write_file(component_id, content, lang = "Base"):
    if lang in remaps:
        lang = remaps[lang]
    if "changelogs" in component_id:
        file_path = config["COMPONENTS"][component_id] + "Changelogs.strings-" + lang
    elif component_id in config["COMPONENTS"]:
        file_path = config["COMPONENTS"][component_id] + "/" + lang + ".lproj/" + get_file_basename(component_id)
    with open(file_path, "w") as file:
        file.write(content) > 0
    if lang == "en" and ("localizable" in component_id or "infoplist" in component_id or "plurals" in component_id):
        with open(file_path.replace("en.lproj", "Base.lproj"), "w") as file:
            file.write(content) > 0

def sanitise_file(file_content, is_upload=False, component_id=False):
    if not component_id:
        return False
    is_plurals = "plurals" in component_id.lower()
    if is_upload:
        file_content = validate_file(file_content, is_plurals=is_plurals)
        if not file_content:
            return False
        gitlab_resource_file = gitlab_download(component_id)
        if gitlab_resource_file:
            gitlab_map = content_to_map(gitlab_resource_file, False, is_plurals=is_plurals)
            file_map = content_to_map(file_content, False, is_plurals=is_plurals)
            diff_map = {key: str for key, str in file_map.items() if key not in gitlab_map or not strings_equal(gitlab_map[key], str, is_plurals=is_plurals)}
            if missing_developer_comments(diff_map, is_plurals=is_plurals):
                print("Error: Uploading branch resource without developer comments is not allowed. Please provide the comments and try again.")
                return False
            file_content = map_to_content(diff_map, is_plurals=is_plurals)
            file_content = process_as_upload(file_content, is_plurals=is_plurals)
            return file_content
        else:
            print("Error: Failed to download gitlab file")
            return False
    return process_as_download(file_content, is_plurals)

def merge_strings(component_content, branch_component_content, is_upload=False, component_id=False):
    if not component_id:
        return False
    merge_content = do_merge(component_content, branch_component_content, is_upload, "plurals" in component_id.lower())
    return sanitise_file(merge_content, is_upload, component_id=component_id)

def read_file(filepath, component_id=False):
    if not filepath or not os.path.exists(filepath):
        filepath = config["COMPONENTS"][component_id] + "/Base.lproj/" + get_file_basename(component_id)
    with open(filepath, "r") as file:
        content = file.read()
    return sanitise_file(content, True, component_id)

def get_branch_name():
    cur_path = os.getcwd()
    os.chdir(script_dir + "..")
    branch_name = subprocess.check_output(['git', 'symbolic-ref', '--short', '-q', 'HEAD'], universal_newlines=True).strip()
    os.chdir(cur_path)
    return re.sub("[^A-Za-z0-9]+", "", branch_name).lower()

def handle_content(lang_keys, id, base_prod_langs, base_branch_langs, build_langs):
    id = id.split(":r:")
    component_id = id[1]
    if config["COMPONENTS"][component_id]:
        for lang in lang_keys:
            content = sanitise_file(base_prod_langs[lang], component_id=component_id)
            if lang in base_branch_langs:
                branch_content = sanitise_file(base_branch_langs[lang], component_id=component_id)
                content = merge_strings(content, branch_content, component_id=component_id)
            if not "LTHPasscodeViewController" in component_id:
                gitlab_resource_content = gitlab_download(component_id, lang)
                if gitlab_resource_content:
                    content = merge_strings(gitlab_resource_content, content, component_id=component_id)
            write_file(component_id, content, lang)

    if len(build_langs):
        for id in build_langs:
            if id in config["COMPONENTS"]:
                for lang in lang_keys:
                    write_file(id, sanitise_file(build_langs[id][lang], component_id=id), lang)
